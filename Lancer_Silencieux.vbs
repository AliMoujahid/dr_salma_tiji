' ==============================================================================
' LANCEUR SILENCIEUX & INVISIBLE - CABINET DENTAIRE DR. SALMA TIJINI
' Lance le serveur Node.js en arrière-plan à 100% sans AUCUNE fenêtre console
' ==============================================================================
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Obtenir le chemin ABSOLU du dossier où se trouve ce script VBS
sScriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
If Right(sScriptDir, 1) <> "\" Then sScriptDir = sScriptDir & "\"

' 1. Vérifier si l'application tourne déjà sur le port 5000
Dim oExec, sOutput
Set oExec = WshShell.Exec("cmd /c netstat -ano | findstr :5000 | findstr LISTENING")
sOutput = oExec.StdOut.ReadAll()

If InStr(sOutput, "LISTENING") > 0 Then
    ' Déjà démarrée -> Ouvrir directement le navigateur
    WshShell.Run "http://localhost:5000", 1, False
    WScript.Quit 0
End If

' 2. Démarrer le serveur en processus détaché 100% invisible
If fso.FolderExists(sScriptDir & "app") Then
    ' Mode Release autonome (Cabinet_Dr_Salma_Tijini_Release)
    WshShell.Run "powershell -WindowStyle Hidden -Command ""Start-Process node -ArgumentList 'server.js' -WorkingDirectory '" & sScriptDir & "app' -WindowStyle Hidden""", 0, True
ElseIf fso.FolderExists(sScriptDir & "backend\dist") Then
    ' Mode Racine du projet avec backend compilé
    WshShell.Run "powershell -WindowStyle Hidden -Command ""Start-Process node -ArgumentList 'dist/server.js' -WorkingDirectory '" & sScriptDir & "backend' -WindowStyle Hidden""", 0, True
Else
    ' Mode Développement avec ts-node-dev
    WshShell.Run "powershell -WindowStyle Hidden -Command ""Start-Process npm -ArgumentList 'run dev' -WorkingDirectory '" & sScriptDir & "backend' -WindowStyle Hidden""", 0, True
End If

' 3. Attendre 3 secondes que le serveur initialise MongoDB et Express
WScript.Sleep 3000

' 4. Ouvrir l'application dans le navigateur par défaut
WshShell.Run "http://localhost:5000", 1, False
