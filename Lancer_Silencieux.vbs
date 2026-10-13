' ==============================================================================
' LANCEUR SILENCIEUX & INVISIBLE - CABINET DENTAIRE DR. SALMA TIJINI
' Lance le serveur Node.js en arrière-plan à 100% sans AUCUNE fenêtre console
' ==============================================================================
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Obtenir le chemin ABSOLU du dossier où se trouve ce script VBS
sScriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
If Right(sScriptDir, 1) <> "\" Then sScriptDir = sScriptDir & "\"

' Fonction de verification HTTP pure (0 fenetre CMD, 0 netstat)
Function IsAppAlreadyRunning()
    On Error Resume Next
    Dim http
    Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
    http.setTimeouts 500, 500, 500, 500
    http.open "GET", "http://127.0.0.1:5000/api/health", False
    http.send
    If Err.Number = 0 Then
        IsAppAlreadyRunning = True
    Else
        IsAppAlreadyRunning = False
    End If
    Set http = Nothing
    On Error GoTo 0
End Function

' 1. Si l'application tourne deja, ouvrir directement le navigateur
If IsAppAlreadyRunning() Then
    WshShell.Run "http://localhost:5000", 1, False
    WScript.Quit 0
End If

' 2. S'assurer que le service MongoDB est demarre (100% silencieux)
On Error Resume Next
WshShell.Run "net start MongoDB", 0, False
On Error GoTo 0

' 3. Demarrer le serveur Node.js en processus detache 100% invisible (Style = 0, sans cmd.exe)
If fso.FolderExists(sScriptDir & "app") Then
    ' Mode Release autonome (Cabinet_Dr_Salma_Tijini_Release)
    WshShell.CurrentDirectory = sScriptDir & "app"
    WshShell.Run "node server.js", 0, False
ElseIf fso.FileExists(sScriptDir & "backend\dist\server.js") Then
    ' Mode Racine du projet avec backend compile
    WshShell.CurrentDirectory = sScriptDir & "backend"
    WshShell.Run "node dist/server.js", 0, False
Else
    ' Mode Developpement
    WshShell.CurrentDirectory = sScriptDir & "backend"
    WshShell.Run "npm run dev", 0, False
End If

' 4. Attendre que le serveur soit pret (boucle intelligente de detection HTTP)
Dim i
For i = 1 To 15
    WScript.Sleep 500
    If IsAppAlreadyRunning() Then Exit For
Next

' 5. Ouvrir l'application dans le navigateur par defaut
WshShell.Run "http://localhost:5000", 1, False
