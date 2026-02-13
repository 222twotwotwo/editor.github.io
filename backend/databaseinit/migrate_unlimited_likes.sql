-- 点赞无上限：移除「每人每文档仅一条」限制，允许同一用户对同一文档多次点赞
-- 若 document_likes 表是由旧版 init 或 migrate 创建（含 uniq_user_document），执行本脚本即可

USE markdown_editor;

-- 移除唯一约束（若存在）
ALTER TABLE `document_likes` DROP INDEX `uniq_user_document`;
