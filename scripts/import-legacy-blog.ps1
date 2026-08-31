$ErrorActionPreference = 'Stop'

$sourceUrl = 'http://www.biotrendenergy.com/wp-json/wp/v2/posts?per_page=100&_embed'
$projectRoot = Split-Path -Parent $PSScriptRoot
$assetDirectory = Join-Path $projectRoot 'public\assets\blog-original'
$outputFile = Join-Path $projectRoot 'src\legacy-blog-posts.json'

New-Item -ItemType Directory -Force -Path $assetDirectory | Out-Null

function ConvertFrom-WordPressHtml {
  param([AllowEmptyString()][string]$Html)

  if ([string]::IsNullOrWhiteSpace($Html)) { return '' }

  $text = $Html
  $text = [regex]::Replace($text, '<(script|style)[^>]*>.*?</\1>', '', 'IgnoreCase,Singleline')
  $text = [regex]::Replace($text, '<br\s*/?>', "`n", 'IgnoreCase')
  $text = [regex]::Replace($text, '<li[^>]*>', '• ', 'IgnoreCase')
  $text = [regex]::Replace($text, '</(p|h[1-6]|li|blockquote|section|div)>', "`n`n", 'IgnoreCase')
  $text = [regex]::Replace($text, '<[^>]+>', '')
  $text = [System.Net.WebUtility]::HtmlDecode($text)
  $text = $text -replace [char]0xA0, ' '
  $text = [regex]::Replace($text, '[\t ]+', ' ')
  $text = [regex]::Replace($text, '[\t ]*\r?\n[\t ]*', "`n")
  $text = [regex]::Replace($text, '(\r?\n){3,}', "`n`n")
  return $text.Trim()
}

function Import-ArticleHtml {
  param(
    [AllowEmptyString()][string]$Html,
    [string]$Slug
  )

  if ([string]::IsNullOrWhiteSpace($Html)) { return '' }

  $articleDirectory = Join-Path $assetDirectory $Slug
  New-Item -ItemType Directory -Force -Path $articleDirectory | Out-Null
  $imagePattern = '<img\b[^>]*(?:src|data-lazy-src)=["''](?<url>[^"'']+)["''][^>]*>'
  $imageUrls = @(
    [regex]::Matches($Html, $imagePattern, 'IgnoreCase') |
      ForEach-Object { $_.Groups['url'].Value } |
      Where-Object { $_ -and $_ -notmatch '^data:' } |
      Select-Object -Unique
  )

  $imageIndex = 0
  foreach ($imageUrl in $imageUrls) {
    $absoluteUrl = if ($imageUrl -match '^https?://') {
      $imageUrl
    } else {
      ([Uri]::new([Uri]'http://www.biotrendenergy.com/', $imageUrl)).AbsoluteUri
    }

    $extension = [System.IO.Path]::GetExtension(([Uri]$absoluteUrl).AbsolutePath).ToLowerInvariant()
    if ($extension -notin @('.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif')) { $extension = '.jpg' }
    $imageIndex += 1
    $fileName = ('image-{0:D2}{1}' -f $imageIndex, $extension)
    $destination = Join-Path $articleDirectory $fileName

    $localUrl = "/assets/blog-original/$Slug/$fileName"
    $downloaded = $false
    try {
      Invoke-WebRequest -Uri $absoluteUrl -OutFile $destination -UseBasicParsing -MaximumRedirection 5 -TimeoutSec 45
      $downloaded = $true
    } catch {
      if ($absoluteUrl -match '^https://') {
        $httpFallback = $absoluteUrl -replace '^https://', 'http://'
        try {
          Invoke-WebRequest -Uri $httpFallback -OutFile $destination -UseBasicParsing -MaximumRedirection 5 -TimeoutSec 45
          $downloaded = $true
        } catch {
          Write-Warning "Could not import inline image: $absoluteUrl"
        }
      } else {
        Write-Warning "Could not import inline image: $absoluteUrl"
      }
    }

    if ($downloaded) {
      $Html = $Html.Replace($imageUrl, $localUrl)
      $Html = $Html.Replace($absoluteUrl, $localUrl)
    }
  }

  $Html = [regex]::Replace($Html, '<(script|style|iframe|object|embed|form)[^>]*>.*?</\1>', '', 'IgnoreCase,Singleline')
  $Html = [regex]::Replace($Html, '<img\b[^>]*(?:src|data-lazy-src)=["'']https?://[^"'']+["''][^>]*>', '', 'IgnoreCase')
  $Html = [regex]::Replace($Html, '\s+on[a-z]+\s*=\s*(["'']).*?\1', '', 'IgnoreCase,Singleline')
  $Html = [regex]::Replace($Html, '\s+(srcset|sizes)\s*=\s*(["'']).*?\2', '', 'IgnoreCase,Singleline')
  $Html = [regex]::Replace($Html, '\s+style\s*=\s*(["'']).*?\1', '', 'IgnoreCase,Singleline')
  return $Html.Trim()
}

$response = Invoke-WebRequest -Uri $sourceUrl -UseBasicParsing -MaximumRedirection 5 -TimeoutSec 45
$posts = $response.Content | ConvertFrom-Json
$importedPosts = @()
$mediaFallbacks = @{
  'farmers-training-biomass-aggregation' = 'http://www.biotrendenergy.com/wp-content/uploads/2023/06/aa58b660-d525-4924-a7d4-0f28a4dcacdb.webp'
}

foreach ($post in $posts) {
  $title = ConvertFrom-WordPressHtml $post.title.rendered
  $excerpt = ConvertFrom-WordPressHtml $post.excerpt.rendered
  $content = ConvertFrom-WordPressHtml $post.content.rendered
  $contentHtml = Import-ArticleHtml -Html $post.content.rendered -Slug $post.slug
  $mediaUrl = $post._embedded.'wp:featuredmedia'[0].source_url
  if (-not $mediaUrl -and $mediaFallbacks.ContainsKey($post.slug)) {
    $mediaUrl = $mediaFallbacks[$post.slug]
  }
  $coverImage = ''

  if ($mediaUrl) {
    $extension = [System.IO.Path]::GetExtension(([Uri]$mediaUrl).AbsolutePath).ToLowerInvariant()
    if (-not $extension) { $extension = '.jpg' }
    $fileName = "$($post.slug)$extension"
    $destination = Join-Path $assetDirectory $fileName
    Invoke-WebRequest -Uri $mediaUrl -OutFile $destination -UseBasicParsing -MaximumRedirection 5 -TimeoutSec 45
    $coverImage = "/assets/blog-original/$fileName"
  }

  $categories = @(
    $post._embedded.'wp:term' |
      ForEach-Object { $_ } |
      Where-Object { $_.taxonomy -eq 'category' -and $_.name -ne 'Uncategorized' } |
      ForEach-Object { ConvertFrom-WordPressHtml $_.name }
  )

  if ($categories.Count -eq 0) { $categories = @('Bioenergy') }

  $importedPosts += [ordered]@{
    id = $post.id
    slug = $post.slug
    title = $title
    excerpt = $excerpt
    content = $content
    contentHtml = $contentHtml
    coverImage = $coverImage
    author = 'Team BTE'
    tags = $categories
    publishedAt = $post.date
    originalUrl = $post.link
  }
}

$json = $importedPosts | ConvertTo-Json -Depth 8
Set-Content -LiteralPath $outputFile -Value $json -Encoding utf8

Write-Output "Imported $($importedPosts.Count) original posts."
Write-Output "Content: $outputFile"
Write-Output "Images: $assetDirectory"
