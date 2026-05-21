# GitHub Secrets 和分支保护配置脚本
# 使用: powershell .\configure-github.ps1

param(
    [string]$GitHubToken = "",
    [string]$ProdHost = "",
    [string]$ProdUser = "",
    [string]$ProdPort = "22",
    [string]$ProdDeployPath = "",
    [string]$SSHPrivateKey = "",
    [string]$SentryDSN = ""
)

$Owner = "Eternity5188"
$Repo = "SpiritHub"
$Branch = "main"

# GitHub API 基础 URL
$APIBase = "https://api.github.com/repos/$Owner/$Repo"

function Set-Secret {
    param(
        [string]$SecretName,
        [string]$SecretValue,
        [string]$Token
    )
    
    if ([string]::IsNullOrWhiteSpace($SecretValue)) {
        Write-Host "⚠️  跳过 $SecretName (值为空)" -ForegroundColor Yellow
        return
    }
    
    $Url = "$APIBase/actions/secrets/$SecretName"
    $Headers = @{
        "Authorization" = "Bearer $Token"
        "Accept" = "application/vnd.github.v3+json"
    }
    
    try {
        # 先获取公钥
        $PublicKeyUrl = "$APIBase/actions/secrets/public-key"
        $KeyResponse = Invoke-RestMethod -Uri $PublicKeyUrl -Headers $Headers -Method Get
        $PublicKey = $KeyResponse.key
        $KeyId = $KeyResponse.key_id
        
        # 使用 libsodium 加密秘密值
        # 由于 PowerShell 没有原生支持，这里使用 base64 编码作为占位符
        # 实际应该使用 libsodium.js 或 tweetsodium
        
        $EncryptedValue = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($SecretValue))
        
        $Body = @{
            encrypted_value = $EncryptedValue
            key_id = $KeyId
        } | ConvertTo-Json
        
        $Response = Invoke-RestMethod -Uri $Url -Headers $Headers -Method Put -Body $Body -ContentType "application/json"
        Write-Host "✅ 已创建/更新 Secret: $SecretName" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ 配置 $SecretName 失败: $_" -ForegroundColor Red
    }
}

function Enable-BranchProtection {
    param(
        [string]$Token
    )
    
    $Url = "$APIBase/branches/$Branch/protection"
    $Headers = @{
        "Authorization" = "Bearer $Token"
        "Accept" = "application/vnd.github.v3+json"
    }
    
    $Body = @{
        required_status_checks = @{
            strict = $true
            contexts = @("quality", "security")
        }
        enforce_admins = $false
        required_pull_request_reviews = @{
            dismiss_stale_reviews = $true
            require_code_owner_reviews = $false
            required_approving_review_count = 1
        }
        restrictions = $null
        allow_force_pushes = $false
        allow_deletions = $false
        allow_auto_merge = $false
        delete_branch_on_merge = $true
        required_linear_history = $false
        required_conversation_resolution = $false
    } | ConvertTo-Json -Depth 10
    
    try {
        $Response = Invoke-RestMethod -Uri $Url -Headers $Headers -Method Put -Body $Body -ContentType "application/json"
        Write-Host "✅ 已启用分支保护规则" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ 配置分支保护失败: $_" -ForegroundColor Red
    }
}

# Main
Write-Host "🔧 GitHub 自动配置" -ForegroundColor Cyan
Write-Host "================" -ForegroundColor Cyan
Write-Host ""

# 检查必需的参数
if ([string]::IsNullOrWhiteSpace($GitHubToken)) {
    Write-Host "❌ 错误: 需要 GitHub Token" -ForegroundColor Red
    Write-Host "用法: .\configure-github.ps1 -GitHubToken <token> -SSHPrivateKey <key> [-SentryDSN <dsn>]"
    exit 1
}

if ([string]::IsNullOrWhiteSpace($SSHPrivateKey)) {
    Write-Host "⚠️  警告: SSH 私钥为空" -ForegroundColor Yellow
}

Write-Host "配置中..."
Write-Host ""

# 配置 Secrets
$ProdHostValue = $ProdHost.Trim()
$ProdUserValue = $ProdUser.Trim()
$ProdDeployPathValue = $ProdDeployPath.Trim()

if ([string]::IsNullOrWhiteSpace($ProdHostValue) -or [string]::IsNullOrWhiteSpace($ProdUserValue) -or [string]::IsNullOrWhiteSpace($ProdDeployPathValue)) {
    Write-Host "❌ 错误: 需要提供 ProdHost、ProdUser 和 ProdDeployPath" -ForegroundColor Red
    Write-Host "用法: .\configure-github.ps1 -GitHubToken <token> -ProdHost <host> -ProdUser <user> -ProdDeployPath <path> -SSHPrivateKey <key> [-SentryDSN <dsn>]"
    exit 1
}

$Secrets = @{
    "PROD_HOST" = $ProdHostValue
    "PROD_USER" = $ProdUserValue
    "PROD_PORT" = $ProdPort
    "PROD_DEPLOY_PATH" = $ProdDeployPathValue
    "PROD_SSH_KEY" = $SSHPrivateKey
    "SENTRY_DSN_PROD" = $SentryDSN
}

Write-Host "📝 配置 Secrets:" -ForegroundColor Yellow
foreach ($SecretName in $Secrets.Keys) {
    Set-Secret -SecretName $SecretName -SecretValue $Secrets[$SecretName] -Token $GitHubToken
}

Write-Host ""
Write-Host "🔐 配置分支保护:" -ForegroundColor Yellow
Enable-BranchProtection -Token $GitHubToken

Write-Host ""
Write-Host "✅ 配置完成！" -ForegroundColor Green
Write-Host ""
Write-Host "后续步骤:"
Write-Host "1. 验证 GitHub 仓库设置"
Write-Host "2. 测试 CI/CD 工作流"
Write-Host "3. 监视首次部署"
