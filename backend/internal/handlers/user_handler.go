package handlers

import (
	"database/sql"
	"markdown-editor-backend/internal/models"
	"markdown-editor-backend/pkg/api"
	"net/http"

	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	db *sql.DB
}

func NewUserHandler(db *sql.DB) *UserHandler {
	return &UserHandler{db: db}
}

func (h *UserHandler) UpdateProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		api.Error(c, http.StatusUnauthorized, "User not authenticated")
		return
	}

	var updateReq struct {
		Email string `json:"email"`
		Bio   string `json:"bio"`
	}

	if err := c.ShouldBindJSON(&updateReq); err != nil {
		api.Error(c, http.StatusBadRequest, "Invalid request")
		return
	}

	// 更新用户信息
	_, err := h.db.Exec(
		"UPDATE users SET email = ?, bio = ?, updated_at = NOW() WHERE id = ?",
		updateReq.Email, updateReq.Bio, userID,
	)

	if err != nil {
		api.Error(c, http.StatusInternalServerError, "Failed to update profile")
		return
	}

	api.Success(c, gin.H{"message": "Profile updated successfully"})
}

func (h *UserHandler) GetUsers(c *gin.Context) {
	// 这里可以添加分页等逻辑
	rows, err := h.db.Query("SELECT id, username, email, created_at FROM users ORDER BY created_at DESC")
	if err != nil {
		api.Error(c, http.StatusInternalServerError, "Failed to fetch users")
		return
	}
	defer rows.Close()

	var users []models.User
	for rows.Next() {
		var user models.User
		if err := rows.Scan(&user.ID, &user.Username, &user.Email, &user.CreatedAt); err != nil {
			api.Error(c, http.StatusInternalServerError, "Failed to scan user")
			return
		}
		users = append(users, user)
	}

	api.Success(c, users)
}
