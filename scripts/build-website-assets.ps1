Add-Type -AssemblyName System.Drawing
$outputDir = Join-Path $PSScriptRoot '../website'
$ink = [System.Drawing.ColorTranslator]::FromHtml('#25233e')
$purple = [System.Drawing.ColorTranslator]::FromHtml('#6552d9')
$paper = [System.Drawing.ColorTranslator]::FromHtml('#f7f7fc')
function New-Canvas($width, $height) {
    $bitmap = [System.Drawing.Bitmap]::new($width, $height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = 'AntiAlias'
    $graphics.TextRenderingHint = 'AntiAliasGridFit'
    return @($bitmap, $graphics)
}
function Draw-Text($graphics, $text, $size, $color, $rect, $rtl) {
    $font = [System.Drawing.Font]::new('Segoe UI', $size, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $brush = [System.Drawing.SolidBrush]::new($color)
    $format = [System.Drawing.StringFormat]::new()
    if ($rtl) { $format.FormatFlags = [System.Drawing.StringFormatFlags]::DirectionRightToLeft }
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    $graphics.DrawString($text, $font, $brush, [System.Drawing.RectangleF]$rect, $format)
    $format.Dispose(); $brush.Dispose(); $font.Dispose()
}
$bitmap, $graphics = New-Canvas 1200 630
$graphics.Clear($paper)
$brush = [System.Drawing.SolidBrush]::new($purple)
$graphics.FillRectangle($brush, 0, 0, 1200, 16)
$brush.Dispose()
Draw-Text $graphics 'ArabicUI' 48 $purple ([System.Drawing.RectangleF]::new(100,65,1000,85)) $false
Draw-Text $graphics 'ديسكورد، بلغتك.' 86 $ink ([System.Drawing.RectangleF]::new(80,170,1040,150)) $true
Draw-Text $graphics 'تعريب الواجهة وإعدادات Vencord' 36 $ink ([System.Drawing.RectangleF]::new(80,320,1040,75)) $true
Draw-Text $graphics 'Windows + macOS' 28 $purple ([System.Drawing.RectangleF]::new(80,420,1040,55)) $false
Draw-Text $graphics 'vencord-2-sa.vercel.app' 22 $ink ([System.Drawing.RectangleF]::new(80,525,1040,40)) $false
$bitmap.Save((Join-Path $outputDir 'social-card.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$graphics.Dispose(); $bitmap.Dispose()
foreach ($size in @(180,192,512)) {
    $bitmap, $graphics = New-Canvas $size $size
    $graphics.Clear($purple)
    Draw-Text $graphics 'ع' ($size * 0.65) ([System.Drawing.Color]::White) ([System.Drawing.RectangleF]::new(0,0,$size,$size)) $true
    $name = if ($size -eq 180) { 'apple-touch-icon.png' } else { "icon-$size.png" }
    $bitmap.Save((Join-Path $outputDir $name), [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose(); $bitmap.Dispose()
}
