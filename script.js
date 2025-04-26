let videoDuration = 0;
let segments = [];

const categoryColors = {
  sponsor: '#ff4d4d',
  intro: '#00c1ff',
  outro: '#ff9d00',
  selfpromo: '#8d00ff',
  interaction: '#1c8d00'
};

const timeline = document.getElementById('timeline');
const tooltip = document.getElementById('tooltip');
const copyPopup = document.getElementById('copyPopup');

function extractVideoID(url) {
  const regex = /(?:v=|\/|^)([0-9A-Za-z_-]{11})(?:\?|&|$)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

async function checkSponsorBlock() {
  const urlInput = document.getElementById('videoURL').value.trim();
  const videoID = extractVideoID(urlInput);
  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = "Loading... ⏳";
  resultDiv.style.display = 'block';
  timeline.style.display = 'none';
  timeline.innerHTML = '';
  segments = [];

  if (videoID == "" || videoID == null) {
    resultDiv.innerHTML = '<p>No URL to check.</p>';
    return;
  }
  
  if (!videoID) {
    resultDiv.innerHTML = '<p>Invalid YouTube URL.</p>';
    return;
  }

  const apiURL = `https://corsproxy.io/?https://sponsor.ajay.app/api/skipSegments?videoID=${videoID}&categories=["sponsor","selfpromo","intro","outro","interaction"]`;

  try {
    const res = await fetch(apiURL);
    const text = await res.text();

    if (text.trim() === "Not Found") {
      resultDiv.innerHTML = `<p>No segments found for this video. 🎉</p>`;
    } else {
      const data = JSON.parse(text);
      segments = data.flat();
      videoDuration = segments[0]?.videoDuration || 600;

      let html = `<p><strong>${segments.length}</strong> segment(s) found:</p>`;
      segments.forEach((seg) => {
        html += `
          <div class="segment">
            <p><strong>Category:</strong> ${seg.category}</p>
            <p><strong>Start:</strong> ${formatTime(seg.segment[0])}</p>
            <p><strong>End:</strong> ${formatTime(seg.segment[1])}</p>
            <p><strong>Votes:</strong> ${seg.votes}</p>
            <p><strong>Locked:</strong> ${seg.locked === 1 ? 'Yes' : 'No'}</p>
            <p><strong>Description:</strong> ${seg.description || 'No description.'}</p>
          </div>`;

        const startPercent = (seg.segment[0] / videoDuration) * 100;
        const endPercent = (seg.segment[1] / videoDuration) * 100;
        const widthPercent = endPercent - startPercent;

        const bar = document.createElement('div');
        bar.className = 'highlight';
        bar.style.left = `${startPercent}%`;
        bar.style.width = `${widthPercent}%`;
        bar.style.backgroundColor = categoryColors[seg.category] || '#ffffff';
        bar.addEventListener('click', () => copyTimestamp(seg));

        timeline.appendChild(bar);
      });

      resultDiv.innerHTML = html;
      timeline.style.display = 'block';
    }
  } catch (error) {
    console.error(error);
    resultDiv.innerHTML = '<p>Error accessing SponsorBlock API. Try analyzing the Network tab (on Chromium Browsers) to investigate.</p>';
  }
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function copyTimestamp(segment) {
  const timestamp = `${formatTime(segment.segment[0])} → ${formatTime(segment.segment[1])}`;
  navigator.clipboard.writeText(timestamp)
    .then(() => {
      showCopyPopup();
    })
    .catch(err => {
      console.error('Failed to copy: ', err);
    });
}

function showCopyPopup() {
  const copyPopup = document.getElementById('copyPopup');
  copyPopup.classList.add('show');

  setTimeout(() => {
    copyPopup.classList.remove('show');
  }, 1600); // fades out smooth
}

timeline.addEventListener('mousemove', (e) => {
  if (videoDuration === 0) return;

  const rect = timeline.getBoundingClientRect();
  const percent = (e.clientX - rect.left) / rect.width;
  const time = percent * videoDuration;

  let found = null;
  for (const seg of segments) {
    if (time >= seg.segment[0] && time <= seg.segment[1]) {
      found = seg;
      break;
    }
  }

  if (found) {
    tooltip.innerHTML = `
      <strong>${found.category}</strong><br>
      ${formatTime(found.segment[0])} → ${formatTime(found.segment[1])}
    `;
  } else {
    tooltip.innerHTML = `${formatTime(time)}`;
  }

  tooltip.style.left = `${e.clientX - rect.left}px`;
  tooltip.classList.add('show');
});

timeline.addEventListener('mouseleave', () => {
  tooltip.classList.remove('show');
});
