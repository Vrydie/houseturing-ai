param (
    [Parameter(Mandatory=$true)][string]$Fixture,
    [string]$BadSignature
)

$Obj = Get-Content $Fixture -Raw | ConvertFrom-Json
$Payload = $Obj | ConvertTo-Json -Depth 10 -Compress
$Secret = "secret_local_test_12345"

if ($BadSignature -eq "--firma-mala") {
    $Signature = "sha256=firma_invalida_123"
} else {
    $hmac = New-Object System.Security.Cryptography.HMACSHA256
    $hmac.Key = [Text.Encoding]::UTF8.GetBytes($Secret)
    $hash = $hmac.ComputeHash([Text.Encoding]::UTF8.GetBytes($Payload))
    $hashString = [System.BitConverter]::ToString($hash).Replace("-", "").ToLower()
    $Signature = "sha256=$hashString"
}

Write-Host "Enviando $Fixture a http://127.0.0.1:5690/webhook/whatsapp"
$Headers = @{
    "Content-Type" = "application/json"
    "X-Hub-Signature-256" = $Signature
}

try {
    $response = Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:5690/webhook/whatsapp" -Headers $Headers -Body $Payload
    $response | ConvertTo-Json
} catch {
    Write-Host "Error: $($_.Exception.Message)"
}
Write-Host "`nHecho."
