package handlers

import (
	"database/sql"
	"net/http"
	"regexp"
	"strconv"

	"github.com/gin-gonic/gin"

	"markdown-editor-backend/internal/models"
	"markdown-editor-backend/pkg/api"
)

// firstImageURL 从 Markdown 内容中解析第一张图片 URL（![alt](url) 或 ![](url)）
func firstImageURL(content string) (url string, ok bool) {
	re := regexp.MustCompile(`!\[[^\]]*\]\s*\(\s*([^)\s]+)\s*\)`)
	matches := re.FindStringSubmatch(content)
	if len(matches) < 2 || matches[1] == "" {
		return "", false
	}
	return matches[1], true
}

type PostHandler struct {
	db *sql.DB
}

func NewPostHandler(db *sql.DB) *PostHandler {
	return &PostHandler{db: db}
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

	rows, err := h.db.Query(`
		SELECT d.id, d.user_id, d.title, d.content, d.created_at, d.updated_at,
		       COALESCE(u.username, '匿名') AS author_name,
		       COALESCE(l.likes_count, 0) AS likes_count
		FROM documents d
		LEFT JOIN users u ON d.user_id = u.id
		LEFT JOIN (
			SELECT document_id, COUNT(*) AS likes_count
			FROM document_likes
			GROUP BY document_id
		) l ON d.id = l.document_id
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

	api.Success(c, gin.H{
		"list":  list,
		"total": total,
		"page":  page,
		"limit": limit,
	})
}

// GetPost 贴文详情：按文档 id 获取单篇文档（公开），内容为 Markdown
func (h *PostHandler) GetPost(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		api.Error(c, http.StatusBadRequest, "无效的贴文 ID")
		return
	}

	var p models.Post
	var likesCount int
	err = h.db.QueryRow(`
		SELECT d.id, d.user_id, d.title, d.content, d.created_at, d.updated_at,
		       COALESCE(u.username, '匿名') AS author_name,
		       COALESCE(l.cnt, 0)
		FROM documents d
		LEFT JOIN users u ON d.user_id = u.id
		LEFT JOIN (SELECT document_id, COUNT(*) AS cnt FROM document_likes GROUP BY document_id) l ON d.id = l.document_id
		WHERE d.id = ?
	`, id).Scan(&p.ID, &p.UserID, &p.Title, &p.Content, &p.CreatedAt, &p.UpdatedAt, &p.AuthorName, &likesCount)

	if err == sql.ErrNoRows {
		api.Error(c, http.StatusNotFound, "贴文不存在")
		return
	}
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "获取贴文失败")
		return
	}

	p.LikesCount = likesCount
	p.CommentsCount = 0
	if imgURL, ok := firstImageURL(p.Content); ok {
		p.MediaType = strPtr("image")
		p.MediaURL = &imgURL
	} else {
		p.MediaType = nil
		p.MediaURL = nil
	}
	p.AuthorAvatar = "https://ui-avatars.com/api/?name=" + p.AuthorName + "&background=random"

	api.Success(c, p)
}

func strPtr(s string) *string { return &s }

// LikePost 点赞文档（需登录），每次请求增加一次点赞，无上限
func (h *PostHandler) LikePost(c *gin.Context) {
	userID, ok := h.getUserID(c)
	if !ok {
		return
	}

	idStr := c.Param("id")
	docID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		api.Error(c, http.StatusBadRequest, "无效的贴文 ID")
		return
	}

	// 先确认文档存在
	var exists int
	err = h.db.QueryRow("SELECT 1 FROM documents WHERE id = ?", docID).Scan(&exists)
	if err == sql.ErrNoRows || err != nil {
		api.Error(c, http.StatusNotFound, "贴文不存在")
		return
	}

	_, err = h.db.Exec("INSERT INTO document_likes (user_id, document_id) VALUES (?, ?)", userID, docID)
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "点赞失败")
		return
	}

	var newCount int
	_ = h.db.QueryRow("SELECT COUNT(*) FROM document_likes WHERE document_id = ?", docID).Scan(&newCount)
	api.Success(c, gin.H{"likes_count": newCount})
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
