package handlers

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"regexp"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"markdown-editor-backend/internal/cache"
	"markdown-editor-backend/internal/models"
	"markdown-editor-backend/pkg/api"
)

// postsCacheTTL 是贴文列表/详情缓存的基础存活时间（实际写入时叠加随机抖动，见 cache.JitterTTL）。
const postsCacheTTL = 60 * time.Second

// imgRe 解析 Markdown 中第一张图片 URL（![alt](url)）。
// 包级 var 避免每次调用重新编译。
var imgRe = regexp.MustCompile(`!\[[^\]]*\]\s*\(\s*([^)\s]+)\s*\)`)

func firstImageURL(content string) (url string, ok bool) {
	matches := imgRe.FindStringSubmatch(content)
	if len(matches) < 2 || matches[1] == "" {
		return "", false
	}
	return matches[1], true
}

type PostHandler struct {
	db    *sql.DB
	cache *cache.Cache
}

func NewPostHandler(db *sql.DB, c *cache.Cache) *PostHandler {
	return &PostHandler{db: db, cache: c}
}

// ListPosts 社区贴文列表：从所有用户的 documents 表读取（Markdown 文档），按更新时间倒序，分页
func (h *PostHandler) ListPosts(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 50 {
		limit = 20
	}
	offset := (page - 1) * limit

	// 缓存查询：命中直接返回；写入侧用延迟双删失效，无需在 key 中编版本号
	cacheKey := cache.PostsListKey(page, limit)
	if cached, ok := h.cache.Get(c.Request.Context(), cacheKey); ok {
		c.Data(http.StatusOK, "application/json; charset=utf-8", cached)
		return
	}

	rows, err := h.db.Query(`
		SELECT d.id, d.user_id, d.title, d.content, d.created_at, d.updated_at,
		       COALESCE(u.username, '匿名') AS author_name,
		       d.likes_count AS likes_count
		FROM documents d
		LEFT JOIN users u ON d.user_id = u.id
		ORDER BY d.updated_at DESC
		LIMIT ? OFFSET ?
	`, limit, offset)
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "获取贴文列表失败")
		return
	}
	defer rows.Close()

	var list []models.Post
	for rows.Next() {
		var p models.Post
		if err := rows.Scan(&p.ID, &p.UserID, &p.Title, &p.Content, &p.CreatedAt, &p.UpdatedAt,
			&p.AuthorName, &p.LikesCount); err != nil {
			continue
		}
		p.CommentsCount = 0
		if imgURL, ok := firstImageURL(p.Content); ok {
			urlCopy := imgURL
			p.MediaType = strPtr("image")
			p.MediaURL = &urlCopy
		} else {
			p.MediaType = nil
			p.MediaURL = nil
		}
		p.AuthorAvatar = "https://ui-avatars.com/api/?name=" + p.AuthorName + "&background=random"
		list = append(list, p)
	}

	var total int
	_ = h.db.QueryRow("SELECT COUNT(*) FROM documents").Scan(&total)

	resp := gin.H{
		"success": true,
		"data": gin.H{
			"list":  list,
			"total": total,
			"page":  page,
			"limit": limit,
		},
	}
	body, _ := json.Marshal(resp)
	h.cache.Set(c.Request.Context(), cacheKey, body, cache.JitterTTL(postsCacheTTL))
	c.Data(http.StatusOK, "application/json; charset=utf-8", body)
}

// GetPost 贴文详情：按文档 id 获取单篇文档（公开），内容为 Markdown
func (h *PostHandler) GetPost(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		api.Error(c, http.StatusBadRequest, "无效的贴文 ID")
		return
	}

	cacheKey := cache.PostDetailKey(id)
	if cached, ok := h.cache.Get(c.Request.Context(), cacheKey); ok {
		c.Data(http.StatusOK, "application/json; charset=utf-8", cached)
		return
	}

	var p models.Post
	err = h.db.QueryRow(`
		SELECT d.id, d.user_id, d.title, d.content, d.created_at, d.updated_at,
		       COALESCE(u.username, '匿名') AS author_name,
		       d.likes_count
		FROM documents d
		LEFT JOIN users u ON d.user_id = u.id
		WHERE d.id = ?
	`, id).Scan(&p.ID, &p.UserID, &p.Title, &p.Content, &p.CreatedAt, &p.UpdatedAt, &p.AuthorName, &p.LikesCount)

	if err == sql.ErrNoRows {
		api.Error(c, http.StatusNotFound, "贴文不存在")
		return
	}
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "获取贴文失败")
		return
	}

	// likes_count 已由 LikePost/UnlikePost 同步写入 MySQL，直接使用
	p.CommentsCount = 0
	if imgURL, ok := firstImageURL(p.Content); ok {
		p.MediaType = strPtr("image")
		p.MediaURL = &imgURL
	} else {
		p.MediaType = nil
		p.MediaURL = nil
	}
	p.AuthorAvatar = "https://ui-avatars.com/api/?name=" + p.AuthorName + "&background=random"

	resp := gin.H{"success": true, "data": p}
	body, _ := json.Marshal(resp)
	h.cache.Set(c.Request.Context(), cacheKey, body, cache.JitterTTL(postsCacheTTL))
	c.Data(http.StatusOK, "application/json; charset=utf-8", body)
}

func strPtr(s string) *string { return &s }

// LikePost 点赞：每个用户对同一篇文章只能点赞一次（UNIQUE 约束保证）。
// 写入流程：
//  1. INSERT IGNORE → 利用 UNIQUE(user_id, document_id) 做去重，并发安全
//  2. 若影响行数 = 0 表示已点过赞，直接返回当前计数，不做任何修改
//  3. 若影响行数 = 1 表示新点赞：Redis INCR 原子计数（高频写无竞态）
//  4. 同时 UPDATE documents.likes_count + 1（持久化，Redis 降级时兜底）
func (h *PostHandler) LikePost(c *gin.Context) {
	userID, ok := h.getUserID(c)
	if !ok {
		return
	}
	docID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		api.Error(c, http.StatusBadRequest, "无效的贴文 ID")
		return
	}

	// 验证文档存在
	var base int
	err = h.db.QueryRow("SELECT likes_count FROM documents WHERE id = ?", docID).Scan(&base)
	if err == sql.ErrNoRows {
		api.Error(c, http.StatusNotFound, "贴文不存在")
		return
	}
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "查询失败")
		return
	}

	// INSERT IGNORE 保证同一用户只能点赞一次，并发下只有一条成功
	result, err := h.db.Exec(
		"INSERT IGNORE INTO document_likes (user_id, document_id) VALUES (?, ?)",
		userID, docID,
	)
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "点赞失败")
		return
	}

	affected, _ := result.RowsAffected()
	if affected == 0 {
		// 已点赞，base 即 MySQL 当前计数（由点赞/取消同步维护）
		api.Success(c, gin.H{"likes_count": base, "already_liked": true})
		return
	}

	// 新点赞：持久化到 MySQL（likes_count 即唯一真相），并失效缓存
	h.db.Exec("UPDATE documents SET likes_count = likes_count + 1 WHERE id = ?", docID)
	h.cache.InvalidatePosts(c.Request.Context(), docID)

	var current int
	_ = h.db.QueryRow("SELECT likes_count FROM documents WHERE id = ?", docID).Scan(&current)
	api.Success(c, gin.H{"likes_count": current, "already_liked": false})
}

// UnlikePost 取消点赞：与 LikePost 对称。
func (h *PostHandler) UnlikePost(c *gin.Context) {
	userID, ok := h.getUserID(c)
	if !ok {
		return
	}
	docID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		api.Error(c, http.StatusBadRequest, "无效的贴文 ID")
		return
	}

	result, err := h.db.Exec(
		"DELETE FROM document_likes WHERE user_id = ? AND document_id = ?",
		userID, docID,
	)
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "取消点赞失败")
		return
	}

	affected, _ := result.RowsAffected()
	if affected == 0 {
		// 本来就没点过赞
		var current int
		_ = h.db.QueryRow("SELECT likes_count FROM documents WHERE id = ?", docID).Scan(&current)
		api.Success(c, gin.H{"likes_count": current, "already_liked": false})
		return
	}

	// 持久化到 MySQL，失效缓存
	h.db.Exec("UPDATE documents SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = ?", docID)
	h.cache.InvalidatePosts(c.Request.Context(), docID)

	var current int
	_ = h.db.QueryRow("SELECT likes_count FROM documents WHERE id = ?", docID).Scan(&current)
	api.Success(c, gin.H{"likes_count": current, "already_liked": false})
}

func (h *PostHandler) getUserID(c *gin.Context) (int64, bool) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		api.Error(c, http.StatusUnauthorized, "请先登录")
		return 0, false
	}
	userID, ok := userIDVal.(int64)
	if !ok {
		api.Error(c, http.StatusInternalServerError, "无效的用户 ID 类型")
		return 0, false
	}
	return userID, true
}
