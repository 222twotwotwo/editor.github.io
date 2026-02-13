-- 为文档表增加图片路径字段，用于“拖拽上传图片”功能：删除文档时同步删除服务器上的图片文件
-- 使用方式：在 MySQL 中执行本文件，例如：mysql -u root -p markdown_editor < databaseinit/migrate_image_path.sql
USE markdown_editor;

ALTER TABLE documents ADD COLUMN image_path VARCHAR(500) NULL DEFAULT NULL COMMENT '图片文档对应的服务器相对路径，如 images/xxx.png';
