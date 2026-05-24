// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 Pollinations AI Image Generation Integration
// Script-to-Image Auto Generation Pipeline
// ═══════════════════════════════════════════════════════════════════════════════

(function() {
  'use strict';

  // Configuration
  const POLLINATIONS_CONFIG = {
    baseUrl: 'https://image.pollinations.ai/prompt/',
    defaultWidth: 1920,
    defaultHeight: 1080,
    defaultModel: 'turbo',  // Options: turbo, flux, flux-realism, flux-anime, flux-3d, any
    noLogo: true
  };

  // Global state for script-to-image chat
  let scriptImagePrompts = [];
  let generatedImages = [];
  let isGenerating = false;

  // ─────── Pollinations Image Generation Function ────────
  async function generateImageFromPrompt(prompt, options = {}) {
    const {
      width = POLLINATIONS_CONFIG.defaultWidth,
      height = POLLINATIONS_CONFIG.defaultHeight,
      model = POLLINATIONS_CONFIG.defaultModel,
      seed = Math.floor(Math.random() * 1000000),
      nologo = POLLINATIONS_CONFIG.noLogo
    } = options;

    // Construct the Pollinations URL
    const params = new URLSearchParams({
      width: width.toString(),
      height: height.toString(),
      seed: seed.toString(),
      nologo: nologo.toString(),
      model: model
    });

    const imageUrl = `${POLLINATIONS_CONFIG.baseUrl}${encodeURIComponent(prompt)}?${params}`;

    // Pre-load image to ensure it's generated
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        resolve({
          url: imageUrl,
          prompt: prompt,
          width: width,
          height: height,
          model: model,
          seed: seed,
          timestamp: new Date().toISOString()
        });
      };
      
      img.onerror = () => {
        reject(new Error('이미지 생성 실패: ' + prompt.substring(0, 50) + '...'));
      };
      
      img.src = imageUrl;
    });
  }

  // ─────── Parse AI Script Response ────────
  function parseScriptResponse(text) {
    const prompts = [];
    
    // Look for image prompts in various formats
    // Format 1: [Image: description]
    const format1 = text.matchAll(/\[Image:\s*([^\]]+)\]/gi);
    for (const match of format1) {
      prompts.push(match[1].trim());
    }
    
    // Format 2: 썸네일: description
    const format2 = text.matchAll(/썸네일[：:]\s*([^\n]+)/gi);
    for (const match of format2) {
      prompts.push(match[1].trim());
    }
    
    // Format 3: Lines starting with "이미지:" or "Image:"
    const format3 = text.matchAll(/(?:이미지|Image)[：:]\s*([^\n]+)/gi);
    for (const match of format3) {
      prompts.push(match[1].trim());
    }
    
    // Format 4: Extract from structured JSON if present
    try {
      const jsonMatch = text.match(/```json([\s\S]*?)```/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[1]);
        if (data.thumbnail) prompts.push(data.thumbnail);
        if (data.images) prompts.push(...data.images);
        if (data.scenes) {
          data.scenes.forEach(scene => {
            if (scene.image) prompts.push(scene.image);
            if (scene.visual) prompts.push(scene.visual);
          });
        }
      }
    } catch (e) {
      // JSON parsing failed, continue with other formats
    }
    
    // Remove duplicates
    return [...new Set(prompts)];
  }

  // ─────── Enhanced Script-to-Image Chat Handler ────────
  window.handleScriptToImageGeneration = async function(scriptText) {
    // Parse the script to extract image prompts
    const prompts = parseScriptResponse(scriptText);
    
    if (prompts.length === 0) {
      showImageGenerationStatus('스크립트에서 이미지 프롬프트를 찾을 수 없습니다.', 'warning');
      return;
    }
    
    scriptImagePrompts = prompts;
    showImageGenerationPanel(prompts);
  };

  // ─────── Display Image Generation Panel ────────
  function showImageGenerationPanel(prompts) {
    // Create or update the image generation modal
    let modal = document.getElementById('pollinationsModal');
    if (!modal) {
      modal = createPollinationsModal();
      document.body.appendChild(modal);
    }
    
    const promptList = modal.querySelector('#promptList');
    const imageGallery = modal.querySelector('#imageGallery');
    
    // Clear previous content
    promptList.innerHTML = '';
    imageGallery.innerHTML = '';
    generatedImages = [];
    
    // Display prompts with edit capability
    prompts.forEach((prompt, index) => {
      const promptItem = document.createElement('div');
      promptItem.className = 'prompt-item';
      promptItem.innerHTML = `
        <div class="flex items-start gap-3 p-3 bg-slate-800 rounded-lg mb-2">
          <span class="text-purple-400 font-bold">${index + 1}</span>
          <textarea id="prompt-${index}" class="flex-1 bg-slate-900 text-slate-100 p-2 rounded border border-slate-700 text-sm resize-none" rows="2">${prompt}</textarea>
          <button onclick="generateSingleImage(${index})" class="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-sm font-bold">생성</button>
        </div>
        <div id="preview-${index}" class="hidden"></div>
      `;
      promptList.appendChild(promptItem);
    });
    
    // Show modal
    modal.classList.remove('hidden');
  }

  // ─────── Create Pollinations Modal ────────
  function createPollinationsModal() {
    const modal = document.createElement('div');
    modal.id = 'pollinationsModal';
    modal.className = 'fixed inset-0 bg-black/80 z-[1000] flex items-center justify-center hidden';
    modal.innerHTML = `
      <div class="bg-slate-900 rounded-xl w-[90vw] max-w-6xl h-[85vh] flex flex-col border border-purple-800/50">
        <!-- Header -->
        <div class="flex items-center justify-between p-4 border-b border-slate-700">
          <div>
            <h2 class="text-xl font-bold text-purple-400">🎨 Pollinations AI 이미지 생성</h2>
            <p class="text-sm text-slate-400">스크립트에서 추출된 이미지 프롬프트</p>
          </div>
          <div class="flex gap-2">
            <select id="modelSelect" class="px-3 py-1 bg-slate-800 text-slate-200 rounded text-sm border border-slate-700">
              <option value="turbo">Turbo (빠름)</option>
              <option value="flux">Flux (고품질)</option>
              <option value="flux-realism">Flux Realism (사실적)</option>
              <option value="flux-anime">Flux Anime (애니메이션)</option>
              <option value="flux-3d">Flux 3D (3D 렌더)</option>
            </select>
            <select id="resolutionSelect" class="px-3 py-1 bg-slate-800 text-slate-200 rounded text-sm border border-slate-700">
              <option value="1920x1080">Full HD (1920×1080)</option>
              <option value="1280x720">HD (1280×720)</option>
              <option value="2560x1440">2K (2560×1440)</option>
              <option value="3840x2160">4K (3840×2160)</option>
              <option value="1080x1920">세로형 (1080×1920)</option>
              <option value="1080x1080">정사각형 (1080×1080)</option>
            </select>
            <button onclick="generateAllImages()" class="px-4 py-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded text-sm font-bold">
              모두 생성
            </button>
            <button onclick="closePollinationsModal()" class="text-slate-400 hover:text-white text-xl">✕</button>
          </div>
        </div>
        
        <!-- Content -->
        <div class="flex-1 flex overflow-hidden">
          <!-- Left: Prompts -->
          <div class="w-1/2 p-4 overflow-y-auto border-r border-slate-700">
            <h3 class="text-sm font-bold text-slate-300 mb-3">프롬프트 목록</h3>
            <div id="promptList"></div>
            
            <!-- Add custom prompt -->
            <div class="mt-4 p-3 bg-slate-800 rounded-lg">
              <p class="text-xs text-slate-400 mb-2">커스텀 프롬프트 추가</p>
              <div class="flex gap-2">
                <input id="customPrompt" type="text" placeholder="새 프롬프트 입력..." 
                  class="flex-1 bg-slate-900 text-slate-100 px-3 py-1 rounded text-sm border border-slate-700">
                <button onclick="addCustomPrompt()" class="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-bold">추가</button>
              </div>
            </div>
          </div>
          
          <!-- Right: Gallery -->
          <div class="w-1/2 p-4 overflow-y-auto">
            <h3 class="text-sm font-bold text-slate-300 mb-3">생성된 이미지</h3>
            <div id="imageGallery" class="grid grid-cols-2 gap-3"></div>
          </div>
        </div>
        
        <!-- Footer -->
        <div class="p-4 border-t border-slate-700">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <span id="generationStatus" class="text-sm text-slate-400"></span>
              <div id="progressBar" class="hidden w-48 h-2 bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all" style="width: 0%"></div>
              </div>
            </div>
            <div class="flex gap-2">
              <button onclick="downloadAllImages()" class="px-4 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-sm font-bold">
                💾 모두 다운로드
              </button>
              <button onclick="copyAllUrls()" class="px-4 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-bold">
                📋 URL 복사
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Click outside to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closePollinationsModal();
      }
    });
    
    return modal;
  }

  // ─────── Generate Single Image ────────
  window.generateSingleImage = async function(index) {
    if (isGenerating) return;
    
    const promptTextarea = document.getElementById(`prompt-${index}`);
    const prompt = promptTextarea.value.trim();
    
    if (!prompt) {
      showImageGenerationStatus('프롬프트를 입력해주세요', 'warning');
      return;
    }
    
    const preview = document.getElementById(`preview-${index}`);
    const model = document.getElementById('modelSelect').value;
    const resolution = document.getElementById('resolutionSelect').value.split('x');
    
    try {
      isGenerating = true;
      showImageGenerationStatus(`이미지 ${index + 1} 생성 중...`, 'info');
      preview.innerHTML = '<div class="text-center py-4"><span class="spinner"></span></div>';
      preview.classList.remove('hidden');
      
      const imageData = await generateImageFromPrompt(prompt, {
        width: parseInt(resolution[0]),
        height: parseInt(resolution[1]),
        model: model
      });
      
      generatedImages[index] = imageData;
      
      // Display preview
      preview.innerHTML = `
        <div class="mt-2 relative group">
          <img src="${imageData.url}" alt="Generated image" class="w-full rounded-lg shadow-lg">
          <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
            <button onclick="downloadImage('${imageData.url}', ${index})" class="px-3 py-1 bg-green-600 text-white rounded text-sm font-bold">다운로드</button>
            <button onclick="viewFullImage('${imageData.url}')" class="px-3 py-1 bg-blue-600 text-white rounded text-sm font-bold">크게보기</button>
          </div>
        </div>
      `;
      
      // Add to gallery
      addToGallery(imageData, index);
      
      showImageGenerationStatus(`이미지 ${index + 1} 생성 완료!`, 'success');
      
    } catch (error) {
      console.error('Image generation error:', error);
      showImageGenerationStatus(`이미지 ${index + 1} 생성 실패: ${error.message}`, 'error');
      preview.innerHTML = '<div class="text-red-400 text-sm p-2">생성 실패</div>';
    } finally {
      isGenerating = false;
    }
  };

  // ─────── Generate All Images ────────
  window.generateAllImages = async function() {
    if (isGenerating) return;
    
    const prompts = [];
    const promptElements = document.querySelectorAll('[id^="prompt-"]');
    
    promptElements.forEach(el => {
      prompts.push(el.value.trim());
    });
    
    const validPrompts = prompts.filter(p => p);
    if (validPrompts.length === 0) {
      showImageGenerationStatus('생성할 프롬프트가 없습니다', 'warning');
      return;
    }
    
    const progressBar = document.getElementById('progressBar');
    const progressFill = progressBar.querySelector('div');
    progressBar.classList.remove('hidden');
    
    try {
      isGenerating = true;
      generatedImages = [];
      
      for (let i = 0; i < prompts.length; i++) {
        if (!prompts[i]) continue;
        
        const progress = ((i + 1) / prompts.length) * 100;
        progressFill.style.width = progress + '%';
        
        await generateSingleImage(i);
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      showImageGenerationStatus(`모든 이미지 생성 완료! (${generatedImages.filter(img => img).length}개)`, 'success');
      
    } catch (error) {
      console.error('Batch generation error:', error);
      showImageGenerationStatus('일괄 생성 중 오류 발생', 'error');
    } finally {
      isGenerating = false;
      progressBar.classList.add('hidden');
      progressFill.style.width = '0%';
    }
  };

  // ─────── Add to Gallery ────────
  function addToGallery(imageData, index) {
    const gallery = document.getElementById('imageGallery');
    
    // Check if item already exists
    let item = document.getElementById(`gallery-item-${index}`);
    if (!item) {
      item = document.createElement('div');
      item.id = `gallery-item-${index}`;
      item.className = 'relative group cursor-pointer';
      gallery.appendChild(item);
    }
    
    item.innerHTML = `
      <img src="${imageData.url}" alt="Image ${index + 1}" class="w-full h-48 object-cover rounded-lg shadow-md">
      <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
        <div class="absolute bottom-2 left-2 right-2">
          <p class="text-white text-xs truncate">${imageData.prompt.substring(0, 50)}...</p>
          <p class="text-white/60 text-[10px]">${imageData.width}×${imageData.height} • ${imageData.model}</p>
        </div>
      </div>
      <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onclick="downloadImage('${imageData.url}', ${index})" class="p-1 bg-black/50 rounded text-white hover:bg-black/70">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2m-5-4l-3 3m0 0l-3-3m3 3V4"></path>
          </svg>
        </button>
      </div>
    `;
  }

  // ─────── Download Single Image ────────
  window.downloadImage = function(url, index) {
    const link = document.createElement('a');
    link.href = url;
    link.download = `pollinations-image-${index + 1}-${Date.now()}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showImageGenerationStatus(`이미지 ${index + 1} 다운로드 시작`, 'info');
  };

  // ─────── Download All Images ────────
  window.downloadAllImages = async function() {
    const validImages = generatedImages.filter(img => img);
    if (validImages.length === 0) {
      showImageGenerationStatus('다운로드할 이미지가 없습니다', 'warning');
      return;
    }
    
    showImageGenerationStatus(`${validImages.length}개 이미지 다운로드 준비 중...`, 'info');
    
    // Use JSZip if available
    if (typeof JSZip !== 'undefined') {
      const zip = new JSZip();
      const folder = zip.folder('pollinations-images');
      
      for (let i = 0; i < validImages.length; i++) {
        const img = validImages[i];
        try {
          const response = await fetch(img.url);
          const blob = await response.blob();
          folder.file(`image-${i + 1}.jpg`, blob);
        } catch (error) {
          console.error(`Failed to add image ${i + 1} to zip:`, error);
        }
      }
      
      const content = await zip.generateAsync({type: 'blob'});
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pollinations-images-${Date.now()}.zip`;
      link.click();
      URL.revokeObjectURL(url);
      
      showImageGenerationStatus('ZIP 다운로드 완료!', 'success');
    } else {
      // Fallback: download individually
      validImages.forEach((img, i) => {
        setTimeout(() => {
          downloadImage(img.url, i);
        }, i * 500);
      });
    }
  };

  // ─────── Copy All URLs ────────
  window.copyAllUrls = function() {
    const validImages = generatedImages.filter(img => img);
    if (validImages.length === 0) {
      showImageGenerationStatus('복사할 URL이 없습니다', 'warning');
      return;
    }
    
    const urls = validImages.map((img, i) => `이미지 ${i + 1}: ${img.url}`).join('\n');
    
    navigator.clipboard.writeText(urls).then(() => {
      showImageGenerationStatus(`${validImages.length}개 URL 복사 완료!`, 'success');
    }).catch(err => {
      console.error('Copy failed:', err);
      showImageGenerationStatus('URL 복사 실패', 'error');
    });
  };

  // ─────── View Full Image ────────
  window.viewFullImage = function(url) {
    window.open(url, '_blank');
  };

  // ─────── Add Custom Prompt ────────
  window.addCustomPrompt = function() {
    const input = document.getElementById('customPrompt');
    const prompt = input.value.trim();
    
    if (!prompt) return;
    
    scriptImagePrompts.push(prompt);
    const index = scriptImagePrompts.length - 1;
    
    const promptList = document.getElementById('promptList');
    const promptItem = document.createElement('div');
    promptItem.className = 'prompt-item';
    promptItem.innerHTML = `
      <div class="flex items-start gap-3 p-3 bg-slate-800 rounded-lg mb-2">
        <span class="text-purple-400 font-bold">${index + 1}</span>
        <textarea id="prompt-${index}" class="flex-1 bg-slate-900 text-slate-100 p-2 rounded border border-slate-700 text-sm resize-none" rows="2">${prompt}</textarea>
        <button onclick="generateSingleImage(${index})" class="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-sm font-bold">생성</button>
      </div>
      <div id="preview-${index}" class="hidden"></div>
    `;
    promptList.appendChild(promptItem);
    
    input.value = '';
    showImageGenerationStatus('커스텀 프롬프트 추가됨', 'success');
  };

  // ─────── Close Modal ────────
  window.closePollinationsModal = function() {
    const modal = document.getElementById('pollinationsModal');
    if (modal) {
      modal.classList.add('hidden');
    }
  };

  // ─────── Status Display ────────
  function showImageGenerationStatus(message, type = 'info') {
    const statusEl = document.getElementById('generationStatus');
    if (!statusEl) return;
    
    const colors = {
      info: 'text-blue-400',
      success: 'text-green-400',
      warning: 'text-yellow-400',
      error: 'text-red-400'
    };
    
    statusEl.className = `text-sm ${colors[type]}`;
    statusEl.textContent = message;
    
    // Auto-hide after 3 seconds for success/info
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        statusEl.textContent = '';
      }, 3000);
    }
  }

  // ─────── Initialize openGrokModal Function ────────
  window.openGrokModal = function() {
    // Get the latest script from the chat
    const messages = document.querySelectorAll('#scriptImgChatMessages .assistant-msg');
    
    if (messages.length === 0) {
      showImageGenerationStatus('먼저 스크립트를 생성해주세요', 'warning');
      return;
    }
    
    const lastMessage = messages[messages.length - 1];
    const scriptText = lastMessage.textContent;
    
    handleScriptToImageGeneration(scriptText);
  };

  // ─────── Add CSS Styles ────────
  const style = document.createElement('style');
  style.textContent = `
    .spinner {
      border: 2px solid rgba(255,255,255,0.1);
      border-top-color: #a855f7;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    #pollinationsModal .prompt-item textarea {
      min-height: 50px;
    }
    
    #pollinationsModal .prompt-item textarea:focus {
      outline: none;
      border-color: #a855f7;
    }
    
    #imageGallery img {
      transition: transform 0.2s;
    }
    
    #imageGallery img:hover {
      transform: scale(1.05);
    }
  `;
  document.head.appendChild(style);

  // ─────── Export to global scope ────────
  window.PollinationsIntegration = {
    generateImageFromPrompt,
    parseScriptResponse,
    handleScriptToImageGeneration,
    showImageGenerationPanel
  };

  console.log('✅ Pollinations Integration loaded successfully');

})();