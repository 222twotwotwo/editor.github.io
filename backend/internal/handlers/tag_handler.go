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

func (h *TagHandler) AddDocumentTag(c *gin.Context) {
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
		TagID int `json:"tag_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		api.Error(c, http.StatusBadRequest, "参数错误")
		return
	}

	// 验证标签属于当前用户
	var count int
	err = h.db.QueryRow("SELECT COUNT(*) FROM tags WHERE id = ? AND user_id = ?", req.TagID, userID).Scan(&count)
	if err != nil || count == 0 {
		api.Error(c, http.StatusForbidden, "标签不存在或无权限")
		return
	}

	// 忽略重复插入错误
	h.db.Exec("INSERT IGNORE INTO document_tags (document_id, tag_id) VALUES (?, ?)", docID, req.TagID)

	api.Success(c, nil)
}

func (h *TagHandler) RemoveDocumentTag(c *gin.Context) {
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

	tagID, err := strconv.Atoi(c.Param("tagId"))
	if err != nil {
		api.Error(c, http.StatusBadRequest, "参数错误")
		return
	}

	// 验证标签属于当前用户
	var count int
	err = h.db.QueryRow("SELECT COUNT(*) FROM tags WHERE id = ? AND user_id = ?", tagID, userID).Scan(&count)
	if err != nil || count == 0 {
		api.Error(c, http.StatusForbidden, "标签不存在或无权限")
		return
	}

	h.db.Exec("DELETE FROM document_tags WHERE document_id = ? AND tag_id = ?", docID, tagID)

	api.Success(c, nil)
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

	// 用 map 接收原始 JSON，以区分"字段未传"与"字段传了 null"
	var rawReq map[string]interface{}
	if err := c.ShouldBindJSON(&rawReq); err != nil {
		api.Error(c, http.StatusBadRequest, "参数错误")
		return
	}

	title, _ := rawReq["title"].(string)
	description, _ := rawReq["description"].(string)
	status, _ := rawReq["status"].(string)
	priority, _ := rawReq["priority"].(string)

	// 仅当请求中明确包含 due_date 键时才更新该字段
	hasDueDate := false
	var dueDate *time.Time
	if v, ok := rawReq["due_date"]; ok {
		hasDueDate = true
		if v != nil {
			if s, ok := v.(string); ok && s != "" {
				t, err := time.Parse(time.RFC3339, s)
				if err == nil {
					dueDate = &t
				}
			}
		}
	}

	tx, err := h.db.Begin()
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "操作失败")
		return
	}

	var execErr error
	if hasDueDate {
		_, execErr = tx.Exec(`
			UPDATE tasks 
			SET title = COALESCE(NULLIF(?, ''), title), 
			    description = COALESCE(?, description),
			    status = COALESCE(NULLIF(?, ''), status),
			    priority = COALESCE(NULLIF(?, ''), priority),
			    due_date = ?
			WHERE id = ? AND user_id = ?
		`, title, description, status, priority, dueDate, taskID, userID)
	} else {
		_, execErr = tx.Exec(`
			UPDATE tasks 
			SET title = COALESCE(NULLIF(?, ''), title), 
			    description = COALESCE(?, description),
			    status = COALESCE(NULLIF(?, ''), status),
			    priority = COALESCE(NULLIF(?, ''), priority)
			WHERE id = ? AND user_id = ?
		`, title, description, status, priority, taskID, userID)
	}
	if execErr != nil {
		tx.Rollback()
		api.Error(c, http.StatusInternalServerError, "更新失败")
		return
	}

	if status != "" {
		var completedErr error
		if status == "completed" {
			_, completedErr = tx.Exec("UPDATE tasks SET completed_at = NOW() WHERE id = ? AND user_id = ?", taskID, userID)
		} else {
			_, completedErr = tx.Exec("UPDATE tasks SET completed_at = NULL WHERE id = ? AND user_id = ?", taskID, userID)
		}
		if completedErr != nil {
			tx.Rollback()
			api.Error(c, http.StatusInternalServerError, "更新完成时间失败")
			return
		}
	}

	if tagIDsRaw, ok := rawReq["tag_ids"]; ok && tagIDsRaw != nil {
		if _, err := tx.Exec("DELETE FROM task_tags WHERE task_id = ?", taskID); err != nil {
			tx.Rollback()
			api.Error(c, http.StatusInternalServerError, "更新标签失败")
			return
		}
		if tagSlice, ok := tagIDsRaw.([]interface{}); ok {
			for _, v := range tagSlice {
				if id, ok := v.(float64); ok {
					if _, err := tx.Exec("INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)", taskID, int(id)); err != nil {
						tx.Rollback()
						api.Error(c, http.StatusInternalServerError, "更新标签失败")
						return
					}
				}
			}
		}
	}

	if err := tx.Commit(); err != nil {
		tx.Rollback()
		api.Error(c, http.StatusInternalServerError, "提交事务失败")
		return
	}
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
