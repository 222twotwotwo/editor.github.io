package handlers

import (
	"database/sql"
	"net/http"
	"strconv"
	"time"

	"markdown-editor-backend/internal/models"
	"markdown-editor-backend/pkg/api"

	"github.com/gin-gonic/gin"
)

type TagHandler struct {
	db *sql.DB
}

type TaskHandler struct {
	db *sql.DB
}

func NewTagHandler(db *sql.DB) *TagHandler {
	return &TagHandler{db: db}
}

func NewTaskHandler(db *sql.DB) *TaskHandler {
	return &TaskHandler{db: db}
}

func (h *TagHandler) GetTags(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		api.Error(c, http.StatusUnauthorized, "未登录")
		return
	}

	rows, err := h.db.Query(`
		SELECT id, user_id, name, color, created_at, updated_at 
		FROM tags 
		WHERE user_id = ? 
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "查询失败")
		return
	}
	defer rows.Close()

	var tags []models.Tag
	for rows.Next() {
		var tag models.Tag
		err := rows.Scan(&tag.ID, &tag.UserID, &tag.Name, &tag.Color, &tag.CreatedAt, &tag.UpdatedAt)
		if err != nil {
			continue
		}
		tags = append(tags, tag)
	}

	api.Success(c, gin.H{"list": tags})
}

func (h *TagHandler) CreateTag(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		api.Error(c, http.StatusUnauthorized, "未登录")
		return
	}

	var req struct {
		Name  string `json:"name" binding:"required"`
		Color string `json:"color"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		api.Error(c, http.StatusBadRequest, "参数错误")
		return
	}

	if req.Color == "" {
		req.Color = "#3b82f6"
	}

	result, err := h.db.Exec(`
		INSERT INTO tags (user_id, name, color) 
		VALUES (?, ?, ?)
	`, userID, req.Name, req.Color)
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "创建失败")
		return
	}

	id, _ := result.LastInsertId()
	api.Success(c, gin.H{"id": id})
}

func (h *TagHandler) UpdateTag(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		api.Error(c, http.StatusUnauthorized, "未登录")
		return
	}

	tagID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		api.Error(c, http.StatusBadRequest, "参数错误")
		return
	}

	var req struct {
		Name  string `json:"name"`
		Color string `json:"color"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		api.Error(c, http.StatusBadRequest, "参数错误")
		return
	}

	_, err = h.db.Exec(`
		UPDATE tags 
		SET name = COALESCE(NULLIF(?, ''), name), 
		    color = COALESCE(NULLIF(?, ''), color)
		WHERE id = ? AND user_id = ?
	`, req.Name, req.Color, tagID, userID)
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "更新失败")
		return
	}

	api.Success(c, nil)
}

func (h *TagHandler) DeleteTag(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		api.Error(c, http.StatusUnauthorized, "未登录")
		return
	}

	tagID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		api.Error(c, http.StatusBadRequest, "参数错误")
		return
	}

	tx, err := h.db.Begin()
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "操作失败")
		return
	}

	_, err = tx.Exec("DELETE FROM document_tags WHERE tag_id = ?", tagID)
	if err != nil {
		tx.Rollback()
		api.Error(c, http.StatusInternalServerError, "删除失败")
		return
	}

	_, err = tx.Exec("DELETE FROM task_tags WHERE tag_id = ?", tagID)
	if err != nil {
		tx.Rollback()
		api.Error(c, http.StatusInternalServerError, "删除失败")
		return
	}

	_, err = tx.Exec("DELETE FROM tags WHERE id = ? AND user_id = ?", tagID, userID)
	if err != nil {
		tx.Rollback()
		api.Error(c, http.StatusInternalServerError, "删除失败")
		return
	}

	tx.Commit()
	api.Success(c, nil)
}

func (h *TagHandler) GetDocumentTags(c *gin.Context) {
	docID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		api.Error(c, http.StatusBadRequest, "参数错误")
		return
	}

	rows, err := h.db.Query(`
		SELECT t.id, t.user_id, t.name, t.color, t.created_at, t.updated_at 
		FROM tags t
		INNER JOIN document_tags dt ON t.id = dt.tag_id
		WHERE dt.document_id = ?
	`, docID)
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "查询失败")
		return
	}
	defer rows.Close()

	var tags []models.Tag
	for rows.Next() {
		var tag models.Tag
		err := rows.Scan(&tag.ID, &tag.UserID, &tag.Name, &tag.Color, &tag.CreatedAt, &tag.UpdatedAt)
		if err != nil {
			continue
		}
		tags = append(tags, tag)
	}

	api.Success(c, gin.H{"list": tags})
}

func (h *TagHandler) UpdateDocumentTags(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		api.Error(c, http.StatusUnauthorized, "未登录")
		return
	}

	docID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		api.Error(c, http.StatusBadRequest, "参数错误")
		return
	}

	var req struct {
		TagIDs []int `json:"tag_ids"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		api.Error(c, http.StatusBadRequest, "参数错误")
		return
	}

	tx, err := h.db.Begin()
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "操作失败")
		return
	}

	_, err = tx.Exec("DELETE FROM document_tags WHERE document_id = ?", docID)
	if err != nil {
		tx.Rollback()
		api.Error(c, http.StatusInternalServerError, "更新失败")
		return
	}

	for _, tagID := range req.TagIDs {
		var count int
		err := tx.QueryRow("SELECT COUNT(*) FROM tags WHERE id = ? AND user_id = ?", tagID, userID).Scan(&count)
		if err != nil || count == 0 {
			continue
		}
		_, err = tx.Exec("INSERT INTO document_tags (document_id, tag_id) VALUES (?, ?)", docID, tagID)
		if err != nil {
			continue
		}
	}

	tx.Commit()
	api.Success(c, nil)
}

func (h *TaskHandler) GetTasks(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		api.Error(c, http.StatusUnauthorized, "未登录")
		return
	}

	status := c.Query("status")
	query := `
		SELECT id, user_id, title, description, status, priority, due_date, completed_at, created_at, updated_at 
		FROM tasks 
		WHERE user_id = ?
	`
	args := []interface{}{userID}

	if status != "" {
		query += " AND status = ?"
		args = append(args, status)
	}
	query += " ORDER BY created_at DESC"

	rows, err := h.db.Query(query, args...)
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "查询失败")
		return
	}
	defer rows.Close()

	var tasks []models.Task
	for rows.Next() {
		var task models.Task
		err := rows.Scan(
			&task.ID, &task.UserID, &task.Title, &task.Description,
			&task.Status, &task.Priority, &task.DueDate, &task.CompletedAt,
			&task.CreatedAt, &task.UpdatedAt,
		)
		if err != nil {
			continue
		}
		tasks = append(tasks, task)
	}

	api.Success(c, gin.H{"list": tasks})
}

func (h *TaskHandler) CreateTask(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		api.Error(c, http.StatusUnauthorized, "未登录")
		return
	}

	var req struct {
		Title       string     `json:"title" binding:"required"`
		Description string     `json:"description"`
		Priority    string     `json:"priority"`
		DueDate     *time.Time `json:"due_date"`
		TagIDs      []int      `json:"tag_ids"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		api.Error(c, http.StatusBadRequest, "参数错误")
		return
	}

	if req.Priority == "" {
		req.Priority = "medium"
	}

	result, err := h.db.Exec(`
		INSERT INTO tasks (user_id, title, description, status, priority, due_date) 
		VALUES (?, ?, ?, 'pending', ?, ?)
	`, userID, req.Title, req.Description, req.Priority, req.DueDate)
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "创建失败")
		return
	}

	taskID, _ := result.LastInsertId()

	for _, tagID := range req.TagIDs {
		h.db.Exec("INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)", taskID, tagID)
	}

	api.Success(c, gin.H{"id": taskID})
}

func (h *TaskHandler) UpdateTask(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		api.Error(c, http.StatusUnauthorized, "未登录")
		return
	}

	taskID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		api.Error(c, http.StatusBadRequest, "参数错误")
		return
	}

	var req struct {
		Title       string     `json:"title"`
		Description string     `json:"description"`
		Status      string     `json:"status"`
		Priority    string     `json:"priority"`
		DueDate     *time.Time `json:"due_date"`
		TagIDs      []int      `json:"tag_ids"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		api.Error(c, http.StatusBadRequest, "参数错误")
		return
	}

	tx, err := h.db.Begin()
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "操作失败")
		return
	}

	_, err = tx.Exec(`
		UPDATE tasks 
		SET title = COALESCE(NULLIF(?, ''), title), 
		    description = COALESCE(?, description),
		    status = COALESCE(NULLIF(?, ''), status),
		    priority = COALESCE(NULLIF(?, ''), priority),
		    due_date = ?
		WHERE id = ? AND user_id = ?
	`, req.Title, req.Description, req.Status, req.Priority, req.DueDate, taskID, userID)
	if err != nil {
		tx.Rollback()
		api.Error(c, http.StatusInternalServerError, "更新失败")
		return
	}

	if req.Status == "completed" {
		tx.Exec("UPDATE tasks SET completed_at = NOW() WHERE id = ?", taskID)
	} else {
		tx.Exec("UPDATE tasks SET completed_at = NULL WHERE id = ?", taskID)
	}

	if req.TagIDs != nil {
		tx.Exec("DELETE FROM task_tags WHERE task_id = ?", taskID)
		for _, tagID := range req.TagIDs {
			tx.Exec("INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)", taskID, tagID)
		}
	}

	tx.Commit()
	api.Success(c, nil)
}

func (h *TaskHandler) DeleteTask(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		api.Error(c, http.StatusUnauthorized, "未登录")
		return
	}

	taskID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		api.Error(c, http.StatusBadRequest, "参数错误")
		return
	}

	tx, err := h.db.Begin()
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "操作失败")
		return
	}

	_, err = tx.Exec("DELETE FROM task_tags WHERE task_id = ?", taskID)
	if err != nil {
		tx.Rollback()
		api.Error(c, http.StatusInternalServerError, "删除失败")
		return
	}

	_, err = tx.Exec("DELETE FROM tasks WHERE id = ? AND user_id = ?", taskID, userID)
	if err != nil {
		tx.Rollback()
		api.Error(c, http.StatusInternalServerError, "删除失败")
		return
	}

	tx.Commit()
	api.Success(c, nil)
}
