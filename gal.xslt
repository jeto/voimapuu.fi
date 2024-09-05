<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:output method="html" encoding="utf-8" indent="yes" />
<xsl:template match="/">
<xsl:text disable-output-escaping='yes'>&lt;!DOCTYPE html&gt;</xsl:text>
<html>
<head>
    <title><xsl:value-of select="$title" /></title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
    .container {
        display: flex;
        flex-wrap: wrap;
       justify-content: space-around;
    }
    img {
        object-fit: cover;
        margin: 1em;
    }
    @media (max-width: 800px) {
        img {
            width: 90%;
        }
    }
    body {
        margin: 0;
    }
    </style>
</head>
<body>
    <div class="container">
        <xsl:for-each select="list/file">
          <a href="{.}" title="click to enlarge">
              <img loading="lazy" src="{.}" alt="{.}" width="580px" height="320px" />
          </a>
        </xsl:for-each>
    </div>
</body>
</html>
</xsl:template>
</xsl:stylesheet>