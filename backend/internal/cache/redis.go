// Package cache 提供基于 Redis 的简单读缓存。
// 设计要点：
//  1. Redis 不可用时所有方法都安全降级（不返回错误，不影响主流程）。
//  2. 写入侧用「延迟双删」精确失效缓存：更新 DB 后立即删一次、短延迟后再删一次，
//     既避免并发读把旧值回填导致的脏缓存，也不像全局版本号那样一次性作废整个命名空间。
package cache

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

// Cache 是对 Redis 的薄封装；nil 接收者所有方法都是 no-op，调用方无需判空。
type Cache struct {
	rdb *redis.Client
}

// New 连接 Redis；连不上时返回 nil（降级），不返回错误。
func New(addr, password string, db int) *Cache {
	if addr == "" {
		log.Println("缓存：未配置 REDIS_ADDR，已禁用")
		return nil
	}
	rdb := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
	})
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Printf("缓存：Redis 不可用，已降级到无缓存模式: %v", err)
		_ = rdb.Close()
		return nil
	}
	log.Printf("缓存：Redis 连接成功 %s", addr)
	return &Cache{rdb: rdb}
}

// Close 关闭底层连接；nil 接收者安全。
func (c *Cache) Close() {
	if c == nil {
		return
	}
	_ = c.rdb.Close()
}

// Get 命中返回值与 true；nil 接收者、未命中、Redis 错误都返回 false。
func (c *Cache) Get(ctx context.Context, key string) ([]byte, bool) {
	if c == nil {
		return nil, false
	}
	b, err := c.rdb.Get(ctx, key).Bytes()
	if err != nil {
		return nil, false
	}
	return b, true
}

// Set 写入；失败仅记日志，不影响主流程。
func (c *Cache) Set(ctx context.Context, key string, val []byte, ttl time.Duration) {
	if c == nil {
		return
	}
	if err := c.rdb.Set(ctx, key, val, ttl).Err(); err != nil {
		log.Printf("缓存写入失败 key=%s: %v", key, err)
	}
}

// JitterTTL 给基础 TTL 叠加 0~20% 的随机抖动后返回。
// 用途：让一批同时写入的 key 错开过期时间，避免集中失效引发缓存雪崩。
// 包级纯函数（不依赖 Redis），调用方应在每次 Set 时单独调用，使每个 key 各自抖动。
func JitterTTL(base time.Duration) time.Duration {
	if base <= 0 {
		return base
	}
	// rand 顶层函数自带锁、并发安全；Go 1.20+ 已自动播种，无需手动 Seed。
	return base + time.Duration(rand.Int63n(int64(base/5)+1))
}

// Del 删除指定的一个或多个精确 key；失败仅记日志，不影响主流程。
func (c *Cache) Del(ctx context.Context, keys ...string) {
	if c == nil || len(keys) == 0 {
		return
	}
	if err := c.rdb.Del(ctx, keys...).Err(); err != nil {
		log.Printf("缓存删除失败 keys=%v: %v", keys, err)
	}
}

// delByPrefix 用 SCAN 游标遍历并删除所有以 prefix 开头的 key。
// 用 SCAN 而非 KEYS，避免在大 key 空间下阻塞 Redis。
func (c *Cache) delByPrefix(ctx context.Context, prefix string) {
	if c == nil {
		return
	}
	var cursor uint64
	for {
		keys, next, err := c.rdb.Scan(ctx, cursor, prefix+"*", 100).Result()
		if err != nil {
			log.Printf("缓存 SCAN 失败 prefix=%s: %v", prefix, err)
			return
		}
		c.Del(ctx, keys...)
		if cursor = next; cursor == 0 {
			return
		}
	}
}

// ── 贴文缓存 ──────────────────────────────────────────────────────────────────
// 列表分页 key：posts:list:p{page}:l{limit}
// 详情     key：post:{docID}
// 失效策略：延迟双删（见 InvalidatePosts）。

const (
	postsListPrefix  = "posts:list:"
	postDetailPrefix = "post:"

	// invalidationDelay 是延迟双删第二次删除前的等待时间。
	// 取值需略大于一次「读 DB → 写缓存」的耗时，以覆盖并发读回填旧值的窗口。
	invalidationDelay = 500 * time.Millisecond
)

// PostsListKey 拼贴文列表分页缓存 key。
func PostsListKey(page, limit int) string {
	return fmt.Sprintf("%sp%d:l%d", postsListPrefix, page, limit)
}

// PostDetailKey 拼贴文详情缓存 key。
func PostDetailKey(docID int64) string {
	return postDetailPrefix + strconv.FormatInt(docID, 10)
}

// delPosts 删除列表全部分页缓存；docID>0 时一并删除该贴文详情缓存。
func (c *Cache) delPosts(ctx context.Context, docID int64) {
	c.delByPrefix(ctx, postsListPrefix)
	if docID > 0 {
		c.Del(ctx, PostDetailKey(docID))
	}
}

// InvalidatePosts 以「延迟双删」失效贴文缓存，调用方应在更新 DB 后调用：
//  1. 立即删除一次（同步）。
//  2. 延迟 invalidationDelay 后再删一次，清掉并发读可能回填的旧值。
//
// 第二次删除在独立 context 中执行——请求 context 在响应返回后即被取消，
// 不能用于延迟任务。nil 接收者安全（no-op）。
func (c *Cache) InvalidatePosts(ctx context.Context, docID int64) {
	if c == nil {
		return
	}
	c.delPosts(ctx, docID) // 第一次删除
	time.AfterFunc(invalidationDelay, func() {
		bg, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		c.delPosts(bg, docID) // 第二次删除（延迟）
	})
}

// ── Token 白名单 ──────────────────────────────────────────────────────────────
// key 格式：jwt:active:{jti}
// value：任意非空字符串（用 "1" 即可），TTL = token 剩余有效期。
// 登录/注册时 SetToken，退出时 DelToken，中间件用 TokenExists 校验。
// Redis 不可用时：
//   - SetToken 降级静默（此时中间件的 TokenExists 会返回 true，即允许通过）
//   - TokenExists 降级返回 true（允许通过），避免 Redis 故障导致所有用户被踢出
//   - DelToken 降级静默（token 会随 JWT 自然过期，安全影响窗口 ≤ JWT_EXPIRY）

const tokenKeyPrefix = "jwt:active:"

func tokenKey(jti string) string { return tokenKeyPrefix + jti }

// SetToken 将 jti 写入白名单，ttl 与 JWT 有效期相同。
func (c *Cache) SetToken(ctx context.Context, jti string, ttl time.Duration) {
	if c == nil {
		return
	}
	if err := c.rdb.Set(ctx, tokenKey(jti), "1", ttl).Err(); err != nil {
		log.Printf("token 白名单写入失败 jti=%s: %v", jti, err)
	}
}

// DelToken 退出登录时主动删除白名单条目，实现即时吊销。
func (c *Cache) DelToken(ctx context.Context, jti string) {
	if c == nil {
		return
	}
	if err := c.rdb.Del(ctx, tokenKey(jti)).Err(); err != nil {
		log.Printf("token 白名单删除失败 jti=%s: %v", jti, err)
	}
}

// TokenExists 返回 access token 的 jti 是否在白名单中。
func (c *Cache) TokenExists(ctx context.Context, jti string) bool {
	return c.whitelistExists(ctx, tokenKey(jti))
}

// whitelistExists 查白名单 key 是否存在。
// Redis 不可用（c == nil 或非 key-not-found 错误）时降级返回 true（放行），
// 避免 Redis 故障导致所有用户被踢出。
func (c *Cache) whitelistExists(ctx context.Context, key string) bool {
	if c == nil {
		return true
	}
	err := c.rdb.Get(ctx, key).Err()
	if err == nil {
		return true // 命中白名单
	}
	if err == redis.Nil {
		return false // key 不存在：已吊销或从未写入
	}
	log.Printf("白名单查询失败 key=%s，降级放行: %v", key, err)
	return true
}

// ── Refresh token 白名单 ──────────────────────────────────────────────────────
// key 格式：jwt:refresh:{jti}，TTL = refresh token 有效期。
// 登录/注册时 SetRefreshToken，退出时 DelRefreshToken，刷新接口用 RefreshTokenExists 校验。
// 降级策略与 access token 白名单一致（Redis 故障时放行）。

const refreshKeyPrefix = "jwt:refresh:"

func refreshKey(jti string) string { return refreshKeyPrefix + jti }

// SetRefreshToken 将 refresh token 的 jti 写入白名单，ttl 与 refresh token 有效期相同。
func (c *Cache) SetRefreshToken(ctx context.Context, jti string, ttl time.Duration) {
	if c == nil {
		return
	}
	if err := c.rdb.Set(ctx, refreshKey(jti), "1", ttl).Err(); err != nil {
		log.Printf("refresh 白名单写入失败 jti=%s: %v", jti, err)
	}
}

// DelRefreshToken 吊销 refresh token（退出登录时调用）。
func (c *Cache) DelRefreshToken(ctx context.Context, jti string) {
	if c == nil {
		return
	}
	if err := c.rdb.Del(ctx, refreshKey(jti)).Err(); err != nil {
		log.Printf("refresh 白名单删除失败 jti=%s: %v", jti, err)
	}
}

// RefreshTokenExists 返回 refresh token 的 jti 是否在白名单中。
func (c *Cache) RefreshTokenExists(ctx context.Context, jti string) bool {
	return c.whitelistExists(ctx, refreshKey(jti))
}

