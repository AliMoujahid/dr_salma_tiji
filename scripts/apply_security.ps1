$path = 'C:\Program Files\MongoDB\Server\8.0\bin\mongod.cfg'
$txt = [System.IO.File]::ReadAllText($path)
if (-not $txt.Contains('authorization: enabled')) {
    $newTxt = $txt -replace '#security:', "security:`r`n  authorization: enabled"
    [System.IO.File]::WriteAllText($path, $newTxt)
    Write-Host "mongod.cfg updated"
} else {
    Write-Host "already enabled"
}
Restart-Service -Name MongoDB -Force
Write-Host "MongoDB restarted with security."
