$historyDir = Join-Path $env:APPDATA "Code\User\History"
$cutoffTime = (Get-Date).AddHours(-4)

if (Test-Path $historyDir) {
    Write-Host "Searching $historyDir for files modified after $cutoffTime"
    Get-ChildItem -Path $historyDir -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -gt $cutoffTime } |
    Sort-Object Length -Descending |
    Select-Object FullName, LastWriteTime, Length -First 50 |
    Format-Table -AutoSize
}
else {
    Write-Host "Directory not found: $historyDir"
}

$workspaceStorage = Join-Path $env:APPDATA "Code\User\workspaceStorage"
if (Test-Path $workspaceStorage) {
    Write-Host "`nSearching $workspaceStorage for files modified after $cutoffTime"
    Get-ChildItem -Path $workspaceStorage -Recurse -File -Filter "*.ts" -ErrorAction SilentlyContinue |
    Where-Object { $_.LastWriteTime -gt $cutoffTime } |
    Sort-Object Length -Descending |
    Select-Object FullName, LastWriteTime, Length -First 10 |
    Format-Table -AutoSize
}
