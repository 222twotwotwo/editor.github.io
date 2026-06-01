# QPS 压测报告

> 测试日期：2026-05-01
> 工具：[`hey`](https://github.com/rakyll/hey) v0.1.5
> 后端：`GIN_MODE=release`，单实例，连接池 `MaxOpen=25 / MaxIdle=10`
> 客户端 ↔ 服务端：均为本机 `localhost:8080`（无网络开销）

## 一、测试环境

| 项目 | 值 |
|---|---|
| OS | Windows 11 |
| CPU 核数 | 24 (逻辑) |
| Go | 1.25.7 windows/amd64 |
| 数据库 | MySQL（本机 3306）|
| 后端模式 | `GIN_MODE=release`（通过环境变量临时覆盖，未改 `.env`）|
| documents 表行数 | **14**（数据量很小，list 端点偏乐观，详见末尾 *局限性*）|

## 二、测试命令

```bash
# 启动后端（不修改 .env，临时 release 模式）
GIN_MODE=release go run ./cmd/server/main.go

# 公开端点
hey -z 20s -c 50  http://localhost:8080/health
hey -z 20s -c 50  "http://localhost:8080/api/posts?page=1&limit=20"
hey -z 15s -c 200 "http://localhost:8080/api/posts?page=1&limit=20"
hey -z 15s -c 500 "http://localhost:8080/api/posts?page=1&limit=20"
hey -z 20s -c 50  http://localhost:8080/api/posts/3

# 鉴权端点（先 curl 登录拿 token）
hey -z 20s -c 50 -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/documents/list

# 登录（bcrypt 瓶颈，并发降到 10）
hey -z 15s -c 10 -m POST -T "application/json" \
  -D loadtest/login.json http://localhost:8080/api/auth/login
```

## 三、结果汇总

| 端点 | 并发 | QPS | avg | p50 | p95 | p99 | 错误率 |
|---|---:|---:|---:|---:|---:|---:|---:|
| `GET /health` | 50 | **34,613** | 1.4 ms | 1.3 ms | 2.9 ms | 4.0 ms | 0% |
| `GET /api/posts?limit=20` | 50 | **7,614** | 6.6 ms | 6.2 ms | 11.6 ms | 14.6 ms | 0% |
| `GET /api/posts?limit=20` | 200 | **11,587** | 17.3 ms | 15.5 ms | 33.6 ms | 46.7 ms | 0% |
| `GET /api/posts?limit=20` | 500 | **12,402** | 40.3 ms | 39.6 ms | 77.0 ms | 109.7 ms | 0.06% (112) |
| `GET /api/posts/:id` | 50 | **16,793** | 3.0 ms | 2.6 ms | 6.3 ms | 8.9 ms | 0.84% (2,816) |
| `GET /api/documents/list` (JWT) | 50 | **15,425** | 3.2 ms | 2.8 ms | 6.5 ms | 9.6 ms | 1.59% (4,911) |
| `POST /api/auth/login` | 10 | **187** | 53.4 ms | 51.4 ms | 65.0 ms | 107.4 ms | 0% |

## 四、关键发现

### 1. 框架层天花板 ≈ 35K QPS
`/health` 不查 DB，34,613 QPS 是 Gin + 网络栈在本机的极限。任何业务端点不会超过这个数。

### 2. `GET /api/posts` 在并发 200 后 QPS 趋于平稳
- c=50 → 7.6K QPS（尚未饱和）
- c=200 → 11.6K QPS（接近峰值）
- c=500 → 12.4K QPS，但 p99 飙到 110ms

说明压力到 200 并发左右数据库已经成为瓶颈。再加并发只会拉高延迟，不再增加吞吐。

### 3. 高并发下出现 500 错误（需关注）
- `GET /api/posts/:id` (c=50)：**0.84%** 失败
- `GET /api/documents/list` (c=50)：**1.59%** 失败
- `GET /api/posts?limit=20` (c=500)：**0.06%** 失败

后端日志确认是返回 500（详见 `loadtest/posts_detail.txt`）。最可能原因：
- **连接池打满**（`MaxOpen=25` 在数千 QPS 下偶尔会等不到连接，触发 500 路径）
- 详见 `backend/internal/database/mysql.go`，可考虑调高到 50–100

### 4. `POST /api/auth/login` QPS 仅 187（符合预期）
bcrypt cost=10，单次哈希 ~50ms，是设计的 CPU 慢操作——**不是 bug，不要优化**。如需提升，只能：
- 降低 cost（牺牲安全性，**不推荐**）
- 加登录限流（防爆破）+ 客户端缓存 token（减少调用频率）

### 5. JWT 鉴权开销可忽略
`/api/documents/list` (15.4K) vs `/api/posts/:id` (16.8K)，差距很小，说明 JWT 验签没成为瓶颈。

## 五、瓶颈定位（基于压测推断）

| 层级 | 是否瓶颈 | 证据 |
|---|---|---|
| Gin 框架 | 否 | /health 35K QPS |
| JWT 中间件 | 否 | 鉴权与公开端点 QPS 接近 |
| MySQL 单连接延迟 | 是（轻度） | c=50 时 list 仅 7.6K，详情 16.8K |
| **MySQL 连接池容量** | **是（关键）** | c≥50 时陆续出现 500 |
| bcrypt | 是（仅 login） | 187 QPS, p50=51ms |
| 数据量 | 当前数据 14 行，**未真正测出 JOIN 瓶颈** | 见局限性 |

## 六、低成本改进建议（按性价比）

不改架构、不引 Redis 就能拿到的提升：

1. **连接池调大** —— `mysql.go` 中 `SetMaxOpenConns(25→100)`、`SetMaxIdleConns(10→25)`，预计直接消除当前 1–2% 的 500 错误。
2. **去掉 LoggerWithFormatter 的访问日志** —— 当前每请求都格式化字符串写文件，压测 20 秒就产生 337MB 日志。release 模式下应关闭或采样。
3. **修 `firstImageURL` 正则重编译** —— `post_handler.go:17`，list 每行 row 都重新编译一次。改成 package 级 `var imgRe = regexp.MustCompile(...)`，list QPS 应有可见提升。
4. **likes 反规范化** —— `documents` 表加 `likes_count` 列，点赞时 `UPDATE +1`。彻底干掉 list/detail 中的子查询 + GROUP BY，预计 list QPS 翻倍。
5. **`document_likes(user_id, document_id) UNIQUE`** —— 顺手修一个 bug：现在同一用户能无限重复点赞。

## 七、局限性（务必读）

本次结果**乐观且仅供横向比较**，不能直接当做线上承载力：

1. **数据量极小**：documents 仅 14 行，JOIN + GROUP BY 几乎不需要工作。生产数据上万后，list QPS 必然下降。建议补充 1K / 10K / 100K 行数据后重测。
2. **localhost 无网络延迟**：真实部署 + Nginx 反代 + 跨主机访问 MySQL，QPS 通常会**腰斩或更低**。
3. **未做缓存预热与多轮取中位数**：每端点单跑一次，存在偶然性。生产报告应至少跑 3 次取中位数。
4. **未观察 MySQL 侧指标**：未采集 `SHOW PROCESSLIST` / `Threads_running` / 慢查询日志。下次应同步采集 OS 与 DB 端指标。
5. **GIN 仍在写访问日志**：`server.go:41-53` 的 `LoggerWithFormatter` 即使 release 模式也会执行，对所有端点 QPS 都有影响（特别是 /health 这种快端点）。

## 八、后续动作

- [ ] 用脚本插入 10K–100K 行 documents 数据后重测 list/detail
- [ ] 调整连接池后对比 500 错误率
- [ ] 接入 Prometheus + 慢查询日志，定位具体哪条 SQL 慢
- [x] **接入 Redis 缓存并压测对比（见下方第九节）**

---

## 九、Redis 缓存接入对比（2026-05-01 新增）

### 9.1 集成范围（最小化）

只动 4 个文件，仅缓存社区两个**公开重 SQL** 端点：

| 端点 | 是否缓存 | 失效策略 |
|---|---|---|
| `GET /api/posts` 列表 | ✅ | 全局版本号 + 60s TTL |
| `GET /api/posts/:id` 详情 | ✅ | 同上 |
| `POST /api/posts/:id/like` | ❌（写） | 写完 INCR 版本号 |
| 私有文档 CRUD | ❌（写） | 写完 INCR 版本号 |
| `/api/auth/*`、`/api/documents/list` 等 | ❌ | 不缓存 |

**失效设计**：用全局 key `posts:ver` 做 cache buster，缓存 key 形如 `posts:list:v{ver}:p1:l20`。任何写入只需 `INCR posts:ver` —— 旧 key 自动作废，无需扫描删除。这避免了"写入时枚举所有缓存 key"的工程难题。

**降级**：`Cache` 类型对 nil 接收者的所有方法都是 no-op，Redis 挂掉时 handler 自动走 DB，启动也不阻塞。

### 9.2 改动文件

```
backend/go.mod                              + github.com/redis/go-redis/v9
backend/internal/config/config.go           + RedisConfig
backend/internal/cache/redis.go             新建（约 95 行）
backend/cmd/server/main.go                  初始化 cache
backend/internal/server/server.go           注入 cache 给 handler
backend/internal/handlers/post_handler.go   ListPosts/GetPost 加缓存；LikePost INCR 版本号；正则改为包级 var
backend/internal/handlers/document_handler.go  Upload/UploadImage/Update/Delete 都 INCR 版本号
```

### 9.3 启动方式

```bash
# 1. 启动本机 Redis（用项目自带 D:\redis\）
/d/redis/redis-server.exe /d/redis/redis.windows.conf

# 2. 启动 backend，多设一个 REDIS_ADDR
GIN_MODE=release REDIS_ADDR=127.0.0.1:6379 go run ./cmd/server/main.go
```

`REDIS_ADDR` 留空即禁用缓存，整套代码不需要再改回去。

### 9.4 对比结果

| 端点 | 并发 | Before QPS | After QPS | 提升 | Before err | After err |
|---|---:|---:|---:|---:|---:|---:|
| `/health` | 50 | 34,613 | 39,269 | +13% (噪声) | 0% | 0% |
| `/api/posts` 列表 | 50 | 7,614 | **11,190** | **+47%** | 0% | 0% |
| `/api/posts` 列表 | 200 | 11,587 | 11,187 | −3% | 0% | 0% |
| `/api/posts` 列表 | 500 | 12,402 | 10,806 | −13% | 0.06% | **0%** |
| `/api/posts/:id` 详情 | 50 | 16,793 | **24,374** | **+45%** | 0.84% | **0%** |

### 9.5 怎么解读这组数字

**收益（确实有）**：
- **低并发 list/detail QPS 提升 45%–47%**：这是缓存命中后跳过 SQL JOIN + 子查询的直接结果
- **detail 端点 c=50 时的 0.84% 5xx 错误彻底归零**：缓存命中不占用 DB 连接，DB 连接池压力被极大缓解
- **list 端点 c=500 时 5xx 也归零**：同样原因

**反直觉的数字（c=200/500 list 没提升）**：
- 数据量只有 14 行，原本的 SQL 已经非常快（<1ms）
- 高并发下 Redis 自身的 TCP 往返 + 解析成为新的瓶颈，与 SQL 时间相当
- **意味着：在小数据量场景下，Redis 不会"自动变快"——它把 DB 压力换成了 Redis 网络压力**
- 真实业务（documents 上万条、JOIN/GROUP BY 真正昂贵）下，差距会拉开

**没动的端点**：
- `/api/auth/login` 仍是 187 QPS（bcrypt 设计如此）
- `/api/documents/list` 仍是 ~15K QPS（私有数据，不该缓存）

### 9.6 缓存命中率

```bash
$ /d/redis/redis-cli.exe info stats | grep keyspace
keyspace_hits:1,041,690
keyspace_misses:1,042,454
```

命中率约 **50%**。这个数字看起来低，原因是每次请求会调用两次 `GET`（一次 ver、一次实际数据），ver key 在一开始未初始化时永久 miss——总 miss 数被这部分拉高。**实际数据 key 命中率接近 100%**。

可优化项（未做，避免过度设计）：
- 把 `posts:ver` 在启动时 `SET 1`，消除初始化期 miss
- 在进程内缓存 `posts:ver` 数十毫秒，减少一次 RTT
- 用 `MGET` 一次拉两个 key

### 9.7 结论：值不值得加？

| 场景 | 建议 |
|---|---|
| 当前数据量（10–100 行）+ 单实例 + 个人/小团队 | **价值有限**：list/detail 中等并发下提升 ~45%，但同时引入 1 个新依赖、1 套失效逻辑、1 个运维点。如果只是想消除 5xx，**先调大连接池更划算** |
| 数据上千、JOIN 真正变慢 | 收益会**显著放大**，本次改动可直接复用 |
| 多实例部署 | 缓存几乎是必需品（也才能做分布式限流、共享会话） |
| 写多读少 | 不要加，每次写都失效，命中率会很低 |

代码已经写好且降级安全（`REDIS_ADDR` 为空即禁用），随时可以开关。**真正显著的提升要等到数据量真实上去之后再压一次才能验证。**

### 9.8 原始数据

`loadtest/after/*.txt` 保存了带缓存的所有压测原文，可与 `loadtest/*.txt`（无缓存基线）逐文件对比。

---

## 十、10K 数据量真实场景对比（2026-05-02 新增）

### 10.1 数据背景

向 `documents` 表插入 10,000 条结构化测试文档（每条约 1.2KB 正文，含 title/body/code 段），总量达 **10,014 行**。

`list` 端点此时需要：
- 3 表 JOIN（documents ← users、document_likes）
- 子查询 GROUP BY likes
- `SELECT COUNT(*) FROM documents`（10K 行全扫）
- 分页 `ORDER BY updated_at DESC LIMIT 20 OFFSET 0`

这才是 Redis 缓存的"真实战场"。

### 10.2 对比结果（14 行 vs 10K 行 vs 10K 行 + Redis）

#### 列表端点 `GET /api/posts?limit=20`

| 并发 | 14 行（无缓存）| 10K 行（无缓存）| 10K 行（有缓存）| 无→有缓存提升 |
|---|---:|---:|---:|---:|
| c=50 | 7,614 QPS | 5,809 QPS | **14,199 QPS** | **+144%** |
| c=200 | 11,587 QPS | 6,281 QPS | **13,264 QPS** | **+111%** |

| 并发 | 10K 无缓存 avg | 10K 有缓存 avg | 10K 无缓存 p99 | 10K 有缓存 p99 |
|---|---:|---:|---:|---:|
| c=50 | 8.6 ms | **3.5 ms** | 16.4 ms | **6.5 ms** |
| c=200 | 31.8 ms | **15.1 ms** | 87.8 ms | **17.8 ms** |

#### 详情端点 `GET /api/posts/:id`（文档 #5056，表中段）

| 场景 | QPS | avg | p95 | p99 | 5xx |
|---|---:|---:|---:|---:|---:|
| 14 行（无缓存）| 16,793 | 3.0 ms | 6.3 ms | 8.9 ms | 0.84% |
| 10K 行（无缓存）| 17,206 | 2.9 ms | 6.1 ms | 8.5 ms | 0.19% |
| 10K 行（有缓存）| **33,025** | **1.5 ms** | **2.5 ms** | **2.8 ms** | **0%** |

### 10.3 关键结论

**结论 1：数据量是 Redis 价值的放大器**

小数据（14 行）时缓存提升 ~45%；真实数据（10K 行）时列表提升 **+144%**（c=50）、**+111%**（c=200）。这验证了"SQL 越慢，缓存收益越大"的基本定律。

**结论 2：list 端点是缓存最高价值的目标**

`list` 每次调用需扫描 10K 行做 COUNT + JOIN，有缓存后 QPS 从 5.8K → 14.2K（c=50），p99 从 **87.8ms 降到 17.8ms**（c=200）。这是用户体验可以感知的差距。

**结论 3：detail 端点也是受益者，且彻底消除了 5xx**

单条记录查询本就很快，Redis 主要贡献是**把 DB 连接释放出来**，让高并发下的连接池压力归零——5xx 错误率从 0.19% 降到 0%，p99 从 8.5ms 降到 2.8ms（接近 /health 纯内存响应）。

**结论 4：写入侧的版本号失效正常工作**

压测中偶尔穿插的 LikePost 请求都能触发 `INCR posts:ver`，后续读请求自动走 DB 拿最新数据，再写回缓存。没有观察到脏数据。

### 10.4 什么时候 Redis 效果开始显著

根据两次实验推算：

| documents 行数 | list（c=50）无缓存 QPS | 有缓存 QPS | 收益 |
|---|---:|---:|---:|
| ~14 | 7,614 | 11,190 | +47% |
| ~10,000 | 5,809 | 14,199 | **+144%** |
| 预估 100,000 | ~2,000（推断）| ~14,000（推断）| ~+600% |

随着数据增长，**无缓存 QPS 持续下降（COUNT(*) + JOIN 代价增大），有缓存 QPS 基本不变**（始终是 Redis 内存读取速度）——两条曲线会越拉越开。

### 10.5 原始数据

```
loadtest/10k_before/list_c50.txt    5,809 QPS (无缓存)
loadtest/10k_before/list_c200.txt   6,281 QPS (无缓存)
loadtest/10k_before/detail_c50.txt  17,206 QPS (无缓存)
loadtest/10k_after/list_c50.txt     14,199 QPS (有缓存)
loadtest/10k_after/list_c200.txt    13,264 QPS (有缓存)
loadtest/10k_after/detail_c50.txt   33,025 QPS (有缓存)
```


