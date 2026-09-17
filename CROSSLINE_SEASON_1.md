# CROSSLINE_SEASON_1.md',
    '# AFTERLIGHT_SEASON_1.md'
  ];

  const candidateElements = Array.from(document.querySelectorAll('div, article, section, pre'));

  fileHeaders.forEach(header => {
    const fileName = header.replace('# ', '').trim();
    const matching = candidateElements
      .map(el => el.innerText || '')
      .filter(text => text.includes(header));

    if (!matching.length) {
      console.warn(`[Skip] Could not find content for ${fileName} in this chat history yet.`);
      return;
    }

    // Pick the longest matching text block (contains the full document)
    const rawContent = matching.reduce((a, b) => (a.length > b.length ? a : b));

    // Slice from the header down to ensure clean start
    const cleanContent = rawContent.substring(rawContent.indexOf(header));

    const blob = new Blob([cleanContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log(`[Success] Triggered download for ${fileName}`);
  });
})();





Flash
Extended

Gemini is AI and can make mistakes.