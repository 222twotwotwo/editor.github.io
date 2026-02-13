package handlers

import (
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"markdown-editor-backend/internal/models"
	"markdown-editor-backend/pkg/api"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"os"
)

const uploadDir = "uploads"
const imagesSubdir = "images"

type DocumentHandler struct {
	db *sql.DB
}

func NewDocumentHandler(db *sql.DB) *DocumentHandler {
	return &DocumentHandler{db: db}
}

func (h *DocumentHandler) getUserID(c *gin.Context) (int64, bool) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		api.Error(c, http.StatusUnauthorized, "未登录或 token 无效")
		return 0, false
	}
	userID, ok := userIDVal.(int64)
	if !ok {
		api.Error(c, http.StatusInternalServerError, "无效的用户 ID 类型")
		return 0, false
	}
	return userID, true
}

// UploadDocument 上传/创建文档
func (h *DocumentHandler) UploadDocument(c *gin.Context) {
	userID, ok := h.getUserID(c)
	if !ok {
		return
	}

	var req models.UploadDocumentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		api.Error(c, http.StatusBadRequest, "请求参数无效: "+err.Error())
		return
	}

	title := strings.TrimSpace(req.Title)
	if title == "" {
		api.Error(c, http.StatusBadRequest, "文档标题不能为空")
		return
	}

	filename := title
	if !strings.HasSuffix(strings.ToLower(filename), ".md") {
		filename += ".md"
	}
	content := req.Content
	if content == "" {
		content = ""
	}
	fileSize := int64(len([]byte(content)))

	result, err := h.db.Exec(
		"INSERT INTO documents (user_id, title, filename, content, file_size, image_path) VALUES (?, ?, ?, ?, ?, ?)",
		userID, title, filename, content, fileSize, nil,
	)
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "上传文档失败")
		return
	}

	id, _ := result.LastInsertId()
	api.Success(c, gin.H{
		"id":         id,
		"title":      title,
		"filename":   filename,
		"file_size":  fileSize,
	})
}

// UploadImage 拖拽上传图片：保存到 uploads/images/，并在数据库创建一条文档，content 为 Markdown 图片链接；删除该文档时会同步删除图片文件
func (h *DocumentHandler) UploadImage(c *gin.Context) {
	userID, ok := h.getUserID(c)
	if !ok {
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		api.Error(c, http.StatusBadRequest, "请选择要上传的图片文件")
		return
	}

	// 只允许图片类型
	ct := file.Header.Get("Content-Type")
	if !strings.HasPrefix(ct, "image/") {
		api.Error(c, http.StatusBadRequest, "仅支持上传图片文件")
		return
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext == "" {
		ext = ".png"
	}
	allowedExt := map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".gif": true, ".webp": true}
	if !allowedExt[ext] {
		api.Error(c, http.StatusBadRequest, "不支持的图片格式")
		return
	}

	// 生成唯一文件名
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		api.Error(c, http.StatusInternalServerError, "生成文件名失败")
		return
	}
	saveName := hex.EncodeToString(b) + ext
	relPath := imagesSubdir + string(filepath.Separator) + saveName
	dir := filepath.Join(uploadDir, imagesSubdir)
	if err := os.MkdirAll(dir, 0755); err != nil {
		api.Error(c, http.StatusInternalServerError, "创建上传目录失败")
		return
	}
	fullPath := filepath.Join(dir, saveName)
	if err := c.SaveUploadedFile(file, fullPath); err != nil {
		api.Error(c, http.StatusInternalServerError, "保存图片失败")
		return
	}

	// 图片访问 URL（相对路径，前端可拼接 baseURL）
	urlPath := "/uploads/" + imagesSubdir + "/" + saveName
	content := "![](" + urlPath + ")"
	title := file.Filename
	if title == "" {
		title = "image" + ext
	}
	filename := title
	if !strings.HasSuffix(strings.ToLower(filename), ".md") {
		filename += ".md"
	}
	fileSize := file.Size

	result, err := h.db.Exec(
		"INSERT INTO documents (user_id, title, filename, content, file_size, image_path) VALUES (?, ?, ?, ?, ?, ?)",
		userID, title, filename, content, fileSize, relPath,
	)
	if err != nil {
		os.Remove(fullPath)
		api.Error(c, http.StatusInternalServerError, "创建文档记录失败")
		return
	}

	id, _ := result.LastInsertId()
	api.Success(c, gin.H{
		"id":      id,
		"url":     urlPath,
		"content": content,
	})
}

// GetDocuments 获取当前用户的文档列表
func (h *DocumentHandler) GetDocuments(c *gin.Context) {
	userID, ok := h.getUserID(c)
	if !ok {
		return
	}

	rows, err := h.db.Query(
		"SELECT id, user_id, title, filename, file_size, created_at, updated_at FROM documents WHERE user_id = ? ORDER BY updated_at DESC",
		userID,
	)
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "获取文档列表失败")
		return
	}
	defer rows.Close()

	var list []models.Document
	for rows.Next() {
		var d models.Document
		if err := rows.Scan(&d.ID, &d.UserID, &d.Title, &d.Filename, &d.FileSize, &d.CreatedAt, &d.UpdatedAt); err != nil {
			continue
		}
		list = append(list, d)
	}

	api.Success(c, list)
}

// GetDocument 获取单篇文档内容
func (h *DocumentHandler) GetDocument(c *gin.Context) {
	userID, ok := h.getUserID(c)
	if !ok {
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		api.Error(c, http.StatusBadRequest, "无效的文档 ID")
		return
	}

	var d models.Document
	err = h.db.QueryRow(
		"SELECT id, user_id, title, filename, content, file_size, created_at, updated_at FROM documents WHERE id = ? AND user_id = ?",
		id, userID,
	).Scan(&d.ID, &d.UserID, &d.Title, &d.Filename, &d.Content, &d.FileSize, &d.CreatedAt, &d.UpdatedAt)

	if err == sql.ErrNoRows {
		api.Error(c, http.StatusNotFound, "文档不存在")
		return
	}
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "获取文档失败")
		return
	}

	api.Success(c, d)
}

// UpdateDocument 更新文档
func (h *DocumentHandler) UpdateDocument(c *gin.Context) {
	userID, ok := h.getUserID(c)
	if !ok {
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		api.Error(c, http.StatusBadRequest, "无效的文档 ID")
		return
	}

	var req models.UpdateDocumentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		api.Error(c, http.StatusBadRequest, "请求参数无效")
		return
	}

	// 先查出现有文档
	var currentTitle, currentContent string
	err = h.db.QueryRow("SELECT title, content FROM documents WHERE id = ? AND user_id = ?", id, userID).
		Scan(&currentTitle, &currentContent)
	if err == sql.ErrNoRows {
		api.Error(c, http.StatusNotFound, "文档不存在")
		return
	}
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "获取文档失败")
		return
	}

	title := strings.TrimSpace(req.Title)
	if title == "" {
		title = currentTitle
	}
	content := req.Content
	if content == "" {
		content = currentContent
	}
	filename := title
	if !strings.HasSuffix(strings.ToLower(filename), ".md") {
		filename += ".md"
	}
	fileSize := int64(len([]byte(content)))

	_, err = h.db.Exec(
		"UPDATE documents SET title = ?, filename = ?, content = ?, file_size = ?, updated_at = NOW() WHERE id = ? AND user_id = ?",
		title, filename, content, fileSize, id, userID,
	)
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "更新文档失败")
		return
	}

	api.Success(c, gin.H{
		"id":        id,
		"title":     title,
		"filename":  filename,
		"file_size": fileSize,
	})
}

// DeleteDocument 删除文档；若该文档为图片文档（含 image_path），会先删除服务器上的图片文件再删记录
func (h *DocumentHandler) DeleteDocument(c *gin.Context) {
	userID, ok := h.getUserID(c)
	if !ok {
		return
	}

	idStr := c.Param("id")
	id, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil {
		api.Error(c, http.StatusBadRequest, "无效的文档 ID")
		return
	}

	var imagePath sql.NullString
	err = h.db.QueryRow("SELECT image_path FROM documents WHERE id = ? AND user_id = ?", id, userID).Scan(&imagePath)
	if err == nil && imagePath.Valid && imagePath.String != "" {
		fullPath := filepath.Join(uploadDir, imagePath.String)
		_ = os.Remove(fullPath)
	}

	result, err := h.db.Exec("DELETE FROM documents WHERE id = ? AND user_id = ?", id, userID)
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "删除文档失败")
		return
	}

	affected, _ := result.RowsAffected()
	if affected == 0 {
		api.Error(c, http.StatusNotFound, "文档不存在")
		return
	}

	api.Success(c, gin.H{"message": "删除成功"})
}

// SearchDocuments 搜索文档（按标题）
func (h *DocumentHandler) SearchDocuments(c *gin.Context) {
	userID, ok := h.getUserID(c)
	if !ok {
		return
	}

	keyword := strings.TrimSpace(c.Query("q"))
	if keyword == "" {
		api.Success(c, []models.Document{})
		return
	}

	pattern := "%" + keyword + "%"
	rows, err := h.db.Query(
		"SELECT id, user_id, title, filename, file_size, created_at, updated_at FROM documents WHERE user_id = ? AND (title LIKE ? OR filename LIKE ?) ORDER BY updated_at DESC",
		userID, pattern, pattern,
	)
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "搜索失败")
		return
	}
	defer rows.Close()

	var list []models.Document
	for rows.Next() {
		var d models.Document
		if err := rows.Scan(&d.ID, &d.UserID, &d.Title, &d.Filename, &d.FileSize, &d.CreatedAt, &d.UpdatedAt); err != nil {
			continue
		}
		list = append(list, d)
	}

	api.Success(c, list)
}

// GetDocumentStats 数据库上传记录统计（今日次数、总文档数、总大小、近7天数据）
func (h *DocumentHandler) GetDocumentStats(c *gin.Context) {
	userID, ok := h.getUserID(c)
	if !ok {
		return
	}

	var totalCount int
	var totalSize int64
	err := h.db.QueryRow(
		"SELECT COUNT(*), COALESCE(SUM(file_size), 0) FROM documents WHERE user_id = ?",
		userID,
	).Scan(&totalCount, &totalSize)
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "获取统计失败")
		return
	}

	var todayCount int
	_ = h.db.QueryRow(
		"SELECT COUNT(*) FROM documents WHERE user_id = ? AND DATE(updated_at) = CURDATE()",
		userID,
	).Scan(&todayCount)

	type dayCount struct {
		Date  string `json:"date"`
		Count int    `json:"count"`
	}
	var daily []dayCount
	rows, err := h.db.Query(`
		SELECT DATE(updated_at) as d, COUNT(*) as c
		FROM documents
		WHERE user_id = ? AND updated_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
		GROUP BY DATE(updated_at)
		ORDER BY d
	`, userID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var d string
			var c int
			if err := rows.Scan(&d, &c); err != nil {
				continue
			}
			daily = append(daily, dayCount{Date: d, Count: c})
		}
	}

	api.Success(c, gin.H{
		"todayCount": todayCount,
		"totalCount": totalCount,
		"totalSize":  totalSize,
		"daily":      daily,
	})
}
