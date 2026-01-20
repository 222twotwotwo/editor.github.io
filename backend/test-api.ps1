Write-Host "=== Markdown Studio API 测试 ===" -ForegroundColor Green

Write-Host "`n1. 健康检查:" -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "http://localhost:5000/health"
Write-Host "   状态: $($health.status)"
Write-Host "   数据库: $($health.database.connected)"
Write-Host "   环境: $($health.environment)"

Write-Host "`n2. 数据库测试:" -ForegroundColor Yellow
$dbTest = Invoke-RestMethod -Uri "http://localhost:5000/api/test-db"
Write-Host "   结果: 1 + 1 = $($dbTest.data.result)"
Write-Host "   数据库: $($dbTest.data.database)"
Write-Host "   MySQL版本: $($dbTest.data.version)"

Write-Host "`n3. 用户列表:" -ForegroundColor Yellow
$users = Invoke-RestMethod -Uri "http://localhost:5000/api/users"
Write-Host "   用户数量: $($users.count)"

Write-Host "`n=== 测试完成 ===" -ForegroundColor Green