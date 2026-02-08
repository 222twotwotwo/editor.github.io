// 临时脚本：生成 bcrypt 哈希，用于初始化管理员密码
// 运行: go run scripts/genhash.go
package main

import (
	"fmt"
	"os"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	password := "123456"
	if len(os.Args) > 1 {
		password = os.Args[1]
	}
	h, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	fmt.Print(string(h))
}
