-- ============================================================
-- 数据库优化迁移
-- 执行方式：mysql -u root -p markdown_editor < databaseinit/migration_optimize.sql
-- 可按需注释掉不想执行的块，各块互相独立
-- ============================================================

USE markdown_editor;
SET NAMES utf8mb4;

-- ------------------------------------------------------------
-- 【高优先级】document_likes：加唯一约束 + 复合索引
-- 修复同一用户可无限点赞的数据 bug，同时加速 COUNT 查询
-- ------------------------------------------------------------
-- 清理现有重复点赞数据（保留每对 (user_id, document_id) 中 id 最小的一条）
DELETE dl FROM document_likes dl
INNER JOIN document_likes dl2
  ON dl.user_id = dl2.user_id AND dl.document_id = dl2.document_id AND dl.id > dl2.id;

-- 加唯一约束（同时覆盖 user_id + document_id 联合查询，替代原有的 idx_user_document 和 idx_document_id）
ALTER TABLE document_likes
  DROP KEY idx_document_id,
  ADD UNIQUE KEY uniq_user_document (user_id, document_id),
  ADD KEY idx_document_id (document_id);

-- ------------------------------------------------------------
-- 【高优先级】documents：加 (user_id, created_at) 覆盖索引
-- 消除 GetDocuments / SearchDocuments 的 Using filesort
-- ------------------------------------------------------------
ALTER TABLE documents
  ADD KEY idx_user_created (user_id, created_at);

-- ------------------------------------------------------------
-- 【中优先级】tasks：加 (user_id, status) 复合索引
-- 消除按用户 + 状态过滤时的 Using filesort
-- ------------------------------------------------------------
ALTER TABLE tasks
  ADD KEY idx_user_status (user_id, status);

-- ------------------------------------------------------------
-- 【中优先级】tasks：status / priority 改为 ENUM
-- 强约束合法值，节省存储（1 字节 vs varchar），排序更快
-- 注意：如果现有数据中有不在枚举值范围内的值，这一步会报错，请先检查
-- ------------------------------------------------------------
-- 检查非法值（执行前先 SELECT 确认）：
-- SELECT DISTINCT status FROM tasks WHERE status NOT IN ('pending','in_progress','completed');
-- SELECT DISTINCT priority FROM tasks WHERE priority NOT IN ('low','medium','high');

ALTER TABLE tasks
  MODIFY COLUMN status   ENUM('pending','in_progress','completed') NOT NULL DEFAULT 'pending'
                         COMMENT '状态',
  MODIFY COLUMN priority ENUM('low','medium','high') NOT NULL DEFAULT 'medium'
                         COMMENT '优先级';

-- ------------------------------------------------------------
-- 【低优先级】外键约束（可选，有写性能代价，建议生产环境谨慎评估）
-- ------------------------------------------------------------
-- ALTER TABLE documents
--   ADD CONSTRAINT fk_documents_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ALTER TABLE document_likes
--   ADD CONSTRAINT fk_likes_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
--   ADD CONSTRAINT fk_likes_user     FOREIGN KEY (user_id)     REFERENCES users(id)     ON DELETE CASCADE;

-- ALTER TABLE document_tags
--   ADD CONSTRAINT fk_dtags_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
--   ADD CONSTRAINT fk_dtags_tag      FOREIGN KEY (tag_id)      REFERENCES tags(id)      ON DELETE CASCADE;

-- ALTER TABLE task_tags
--   ADD CONSTRAINT fk_ttags_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
--   ADD CONSTRAINT fk_ttags_tag  FOREIGN KEY (tag_id)  REFERENCES tags(id)  ON DELETE CASCADE;

-- ------------------------------------------------------------
-- 【低优先级】users.idx_created_at 冗余，可删除（实际查询从未用到）
-- ------------------------------------------------------------
-- ALTER TABLE users DROP KEY idx_created_at;
