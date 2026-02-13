-- 迁移脚本：从独立 posts 表改为社区贴文来自 documents 表
-- 适用场景：已有旧版数据库（含 posts 表），需要切换到「社区贴文 = 所有用户 MD 文档」
-- 执行前请备份数据库。

USE markdown_editor;

-- 1. 创建文档点赞表（若不存在）
CREATE TABLE IF NOT EXISTS `document_likes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `document_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_user_document` (`user_id`, `document_id`),
  KEY `idx_document_id` (`document_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 为 documents 增加联合索引（若尚未存在，可按需执行）
-- ALTER TABLE documents ADD KEY idx_user_updated (user_id, updated_at);

-- 3. 删除旧的社区帖子表
DROP TABLE IF EXISTS `posts`;
