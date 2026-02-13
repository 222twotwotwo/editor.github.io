package models

import (
	"time"
)

// Post 社区贴文：来自 documents 表，content 为 Markdown；兼容保留 media 字段（文档型贴文为空）
type Post struct {
	ID            int64     `json:"id"`
	UserID        int64     `json:"user_id"`
	Title         string    `json:"title"`
	Content       string    `json:"content"` // Markdown 原文
	MediaType     *string   `json:"media_type,omitempty"`
	MediaURL      *string   `json:"media_url,omitempty"`
	LikesCount    int       `json:"likes_count"`
	CommentsCount int       `json:"comments_count"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
	AuthorName    string    `json:"author_name"`
	AuthorAvatar  string    `json:"author_avatar,omitempty"`
}
