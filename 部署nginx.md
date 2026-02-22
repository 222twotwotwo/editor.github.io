# nginx托管静态资源 + 后端反向代理

### 环境要求 //linux

sudo apt update && sudo apt upgrade -y //更新apt源并升级系统
- **nginx** 

sudo apt update
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
nginx -v


- **mysql** 

wget https://dev.mysql.com/get/mysql-apt-config_0.8.35-1_all.deb
sudo dpkg -i mysql-apt-config_0.8.35-1_all.deb
sudo apt update
sudo apt install mysql-server -y
sudo systemctl start mysql
sudo systemctl enable mysql
sudo mysql_secure_installation
mysql --version

- **go** 

wget https://go.dev/dl/go1.24.1.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.24.1.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
echo 'export GOPATH=$HOME/go' >> ~/.bashrc
echo 'export PATH=$PATH:$GOPATH/bin' >> ~/.bashrc
source ~/.bashrc
go version


- **node** 

sudo apt install nodejs -y
node -v
npm -v


- **git** 

sudo apt install git -y
git --version //验证





- 获取仓库
  - git clone https://github.com/222twotwotwo/editor.github.io/tree/2.0
  - 2.0版本是服务器部署版本，main分支是windowns开发



- 前端
  - 删除node_modules,该文件是window开发环境下的依赖文件，linux服务器不需要，得重新安装
  - rm -rf node_modules  // 删除node_modules目录
  - npm install  // 重新安装依赖

  - 在前端frontend目录下执行 npm run build  // 打包前端静态资源,存放在dist目录下


- 后端不需要删除包，go语言无缝切换

  - 后端env配置
  - 执行vim /root/workspace/markdown/editor.github.io/backend/.env   （路径根据实际情况修改）
 在打开的编辑器里输入下面内容（把「你的MySQL密码」和「你的JWT密钥」改成实际内容）：
 ```
 DB_HOST=localhost
 
 DB_PORT=3306
 
 DB_USER=root
 
 DB_PASSWORD=你的MySQL密码
 
 DB_NAME=markdown_editor
 
 JWT_SECRET=你的JWT密钥
 
 JWT_EXPIRY=24
 
 SERVER_PORT=8080
 
 GIN_MODE=release
 ```

  - 创建 uploads 目录，用户上传的文件会存放在这里
  - 执行：
mkdir -p /root/workspace/markdown/editor.github.io/backend/uploads
ls -la /root/workspace/markdown/editor.github.io/backend/uploads
  - export GOOS=linux
  - export GOARCH=amd64
  - go build -o server ./cmd/server
  - 后端在backend目录下执行 go build -o markdown_editor  // 编译后端程序,生成server可执行程序  


- mysql 数据库
  - 执行：
mysql -u root -p
  - 输入MySQL root密码
  - 执行后端databaseinit/init.sql && seed     //初始化数据库
  - 退出MySQL：exit


**准备工作完成** dist  server mysql


## 配置nginx

创建 systemd 服务，让后端开机自启
sudo vim /etc/systemd/system/markdown-backend.service
```
[Unit]
Description=Markdown Editor Backend (Gin)
After=network.target mysql.service

[Service]
Type=simple
User=root
WorkingDirectory=/root/workspace/markdown/editor.github.io/backend
ExecStart=/root/workspace/markdown/editor.github.io/backend/server
Restart=on-failure
RestartSec=5
EnvironmentFile=/root/workspace/markdown/editor.github.io/backend/.env

[Install]
WantedBy=multi-user.target
```

sudo systemctl daemon-reload

sudo systemctl enable markdown-backend

sudo systemctl start markdown-backend

sudo systemctl status markdown-backend


curl -s http://127.0.0.1:8080/health   // 检查


sudo vim /etc/nginx/conf.d/markdown-editor.conf

```
server {
    listen 80;
    server_name 你的公网ip;

    root /root/workspace/markdown/editor.github.io/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:8080/uploads/;
        proxy_set_header Host $host;
    }

    location /health {
        proxy_pass http://127.0.0.1:8080/health;
        proxy_set_header Host $host;
    }
}
```

开放nginx权限

- 让 Nginx 能进入各级目录（只给“执行/遍历”）
sudo chmod o+x /root
sudo chmod o+x /root/workspace
sudo chmod o+x /root/workspace/markdown
sudo chmod o+x /root/workspace/markdown/editor.github.io
sudo chmod o+x /root/workspace/markdown/editor.github.io/frontend

- 让 Nginx 能读 dist 里的所有文件
sudo chmod -R o+r /root/workspace/markdown/editor.github.io/frontend/dist
sudo find /root/workspace/markdown/editor.github.io/frontend/dist -type d -exec chmod o+x {} \;

sudo nginx -t


sudo systemctl reload nginx


检查

curl -s http://8.134.183.201/health
curl -sI http://8.134.183.201/



### 最后记得开放80端口




## 新增

```
sudo mkdir -p /var/www/markdown-editor

# 2. 复制文件（注意用 /. 而不是 /*，这样可以正确复制隐藏文件）
sudo cp -r /root/workspace/markdown/editor.github.io/frontend/dist/. /var/www/markdown-editor/

# 3. 设置所有者和权限
sudo chown -R www-data:www-data /var/www/markdown-editor
sudo chmod -R 755 /var/www/markdown-editor
# 确保目录是 755，文件是 644
sudo find /var/www/markdown-editor -type d -exec chmod 755 {} \;
sudo find /var/www/markdown-editor -type f -exec chmod 644 {} \;

# 4. 修改 Nginx 配置
# 编辑配置文件，将 root 改为 /var/www/markdown-editor
sudo vim /etc/nginx/conf.d/markdown-editor.conf

# 5. 测试配置并重载 Nginx
sudo nginx -t && sudo systemctl reload nginx


```
以后每次执行npm run build 后，都需要执行
sudo cp -r /root/workspace/markdown/editor.github.io/frontend/dist/. /var/www/markdown-editor/

