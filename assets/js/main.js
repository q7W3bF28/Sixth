// 全局变量
let selectedBookcase = null;
let currentBookcasePassword = null;
let ably = null;
let currentComic = null;
let currentPage = 1;
let totalPages = 1;
let currentZoom = 1.0;
let currentRotation = 0;
let keyboardListenerActive = false;

// Ably 配置
const ABLY_API_KEY = 'nc5NGw.wSmsXg:SMs5pD5aJ4hGMvNZnd7pJp2lYS2X1iCmWm_yeLx_pkk';

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 初始化Ably
    ably = new Ably.Realtime(ABLY_API_KEY);
    
    // 根据当前页面执行不同初始化
    const currentPath = window.location.pathname;
    if (currentPath.includes('index.html') || currentPath === '/' || currentPath.endsWith('/')) {
        initHomePage();
    } else if (currentPath.includes('share.html')) {
        initSharePage();
    } else if (currentPath.includes('read.html')) {
        initReadPage();
    }
});

// 首页初始化
function initHomePage() {
    // 绑定分享按钮
    const shareBtn = document.getElementById('start-share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', function() {
            window.location.href = 'share.html';
        });
    }
    
    // 绑定阅读按钮
    const readBtn = document.getElementById('start-read-btn');
    if (readBtn) {
        readBtn.addEventListener('click', function() {
            window.location.href = 'read.html';
        });
    }
}

// 分享页面初始化
function initSharePage() {
    generateBookcases();
    
    // 文件上传区域点击事件
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('comic-file');
    
    if (uploadArea && fileInput) {
        uploadArea.addEventListener('click', function() {
            fileInput.click();
        });
        
        // 拖放功能
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            uploadArea.classList.add('drag-over');
        });
        
        uploadArea.addEventListener('dragleave', function() {
            uploadArea.classList.remove('drag-over');
        });
        
        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            uploadArea.classList.remove('drag-over');
            
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                handleFileSelection();
            }
        });
        
        // 文件选择事件
        fileInput.addEventListener('change', handleFileSelection);
    }
    
    // 上传按钮事件
    const uploadBtn = document.getElementById('upload-btn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', uploadComic);
    }
    
    // 返回按钮事件
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            window.location.href = 'index.html';
        });
    }
    
    // 复制密码按钮事件
    const copyBtn = document.getElementById('copy-password');
    if (copyBtn) {
        copyBtn.addEventListener('click', function() {
            const password = document.getElementById('new-password').textContent;
            navigator.clipboard.writeText(password).then(() => {
                const btn = this;
                const originalText = btn.textContent;
                btn.textContent = '✓ 已复制';
                btn.disabled = true;
                
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.disabled = false;
                }, 2000);
            }).catch(err => {
                console.error('复制失败:', err);
                alert('复制失败，请手动复制密码');
            });
        });
    }
}

// 阅读页面初始化
function initReadPage() {
    generateBookcases();
    
    // 验证密码按钮事件
    const verifyBtn = document.getElementById('verify-btn');
    if (verifyBtn) {
        verifyBtn.addEventListener('click', verifyPassword);
    }
    
    // 密码输入框回车事件
    const passwordInput = document.getElementById('password-input');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                verifyPassword();
            }
        });
    }
    
    // 密码显示切换
    const toggleBtn = document.getElementById('toggle-password');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', function() {
            const input = document.getElementById('password-input');
            if (input.type === 'password') {
                input.type = 'text';
                this.textContent = '👁️‍';
            } else {
                input.type = 'password';
                this.textContent = '👁️';
            }
        });
    }
    
    // 查看器控制按钮事件
    document.getElementById('prev-page')?.addEventListener('click', prevPage);
    document.getElementById('next-page')?.addEventListener('click', nextPage);
    document.getElementById('fullscreen-btn')?.addEventListener('click', toggleFullscreen);
    document.getElementById('zoom-in-btn')?.addEventListener('click', zoomIn);
    document.getElementById('zoom-out-btn')?.addEventListener('click', zoomOut);
    document.getElementById('rotate-btn')?.addEventListener('click', rotateComic);
    document.getElementById('fit-screen-btn')?.addEventListener('click', fitComicToScreen);
    document.getElementById('close-viewer')?.addEventListener('click', closeViewer);
    
    // 返回按钮事件
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', function() {
            window.location.href = 'index.html';
        });
    }
    
    // 添加夜间模式切换
    const nightModeBtn = document.createElement('button');
    nightModeBtn.className = 'control-btn';
    nightModeBtn.title = '夜间模式';
    nightModeBtn.innerHTML = '🌙';
    nightModeBtn.addEventListener('click', toggleNightMode);
    document.querySelector('.viewer-controls')?.appendChild(nightModeBtn);
    
    // 添加阅读进度条
    const progressBar = document.createElement('div');
    progressBar.className = 'reader-progress';
    progressBar.innerHTML = '<div class="reader-progress-bar"></div>';
    document.body.appendChild(progressBar);
}

// 关闭查看器
function closeViewer() {
    document.getElementById('comic-viewer').style.display = 'none';
    document.getElementById('password-section').style.display = 'block';
    disableKeyboardNavigation();
}

// 上一页
function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        updateComicDisplay();
        updateReaderProgress();
    }
}

// 下一页
function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        updateComicDisplay();
        updateReaderProgress();
    }
}

// 放大
function zoomIn() {
    if (currentZoom < 3.0) {
        currentZoom += 0.25;
        updateComicDisplay();
    }
}

// 缩小
function zoomOut() {
    if (currentZoom > 0.25) {
        currentZoom -= 0.25;
        updateComicDisplay();
    }
}

// 旋转漫画
function rotateComic() {
    currentRotation = (currentRotation + 90) % 360;
    updateComicDisplay();
}

// 适应屏幕
function fitComicToScreen() {
    if (!currentComic) return;
    
    const container = document.querySelector('.viewer-container');
    if (!container) return;
    
    const containerWidth = container.clientWidth - 40;
    const containerHeight = container.clientHeight - 40;
    
    if (currentComic.format === 'pdf') {
        const canvas = document.getElementById('pdf-canvas');
        if (!canvas) return;
        
        const scaleX = containerWidth / canvas.width;
        const scaleY = containerHeight / canvas.height;
        currentZoom = Math.min(scaleX, scaleY);
    } else if (currentComic.format === 'zip') {
        const image = document.getElementById('comic-image');
        if (!image || !image.naturalWidth) return;
        
        const scaleX = containerWidth / image.naturalWidth;
        const scaleY = containerHeight / image.naturalHeight;
        currentZoom = Math.min(scaleX, scaleY);
    }
    
    updateComicDisplay();
}

// 键盘导航
function enableKeyboardNavigation() {
    if (keyboardListenerActive) return;
    
    document.addEventListener('keydown', handleKeyDown);
    keyboardListenerActive = true;
}

function disableKeyboardNavigation() {
    document.removeEventListener('keydown', handleKeyDown);
    keyboardListenerActive = false;
}

function handleKeyDown(e) {
    // 忽略在输入框中的按键
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    switch(e.key) {
        case 'ArrowLeft':
            prevPage();
            break;
        case 'ArrowRight':
            nextPage();
            break;
        case '+':
        case '=':
            zoomIn();
            break;
        case '-':
        case '_':
            zoomOut();
            break;
        case 'f':
            toggleFullscreen();
            break;
        case 'r':
            rotateComic();
            break;
        case '0':
            fitComicToScreen();
            break;
        case 'Escape':
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                closeViewer();
            }
            break;
        case 'n':
            toggleNightMode();
            break;
    }
}

// 生成书柜
function generateBookcases() {
    const bookcaseGrid = document.querySelector('.bookcase-grid');
    if (!bookcaseGrid) return;
    
    bookcaseGrid.innerHTML = '';
    
    for (let i = 1; i <= 10; i++) {
        const bookcase = document.createElement('div');
        bookcase.className = 'bookcase';
        bookcase.dataset.id = i;
        
        bookcase.innerHTML = `
            <div class="bookcase-icon">📚</div>
            <h3>书柜 ${i}</h3>
        `;
        
        bookcase.addEventListener('click', function() {
            // 移除其他书柜的选中状态
            document.querySelectorAll('.bookcase').forEach(b => b.classList.remove('selected'));
            
            // 选中当前书柜
            this.classList.add('selected');
            selectedBookcase = this.dataset.id;
            
            // 根据当前页面执行不同操作
            const currentPath = window.location.pathname;
            if (currentPath.includes('share.html')) {
                const uploadSection = document.querySelector('.upload-section');
                if (uploadSection) {
                    uploadSection.style.display = 'block';
                }
                const fileInfo = document.getElementById('file-info');
                if (fileInfo) {
                    fileInfo.style.display = 'none';
                }
                const successMessage = document.getElementById('success-message');
                if (successMessage) {
                    successMessage.style.display = 'none';
                }
                // 显示当前选中的书柜
                const selectedDisplay = document.getElementById('selected-bookcase-display');
                if (selectedDisplay) {
                    selectedDisplay.textContent = selectedBookcase;
                }
            } else if (currentPath.includes('read.html')) {
                const passwordSection = document.getElementById('password-section');
                if (passwordSection) {
                    passwordSection.style.display = 'block';
                }
                // 填充存储的密码
                const passwordInput = document.getElementById('password-input');
                if (passwordInput) {
                    const storedPassword = localStorage.getItem(`bookcase_${selectedBookcase}_password`);
                    passwordInput.value = storedPassword || '123456';
                    passwordInput.focus();
                }
            }
        });
        
        bookcaseGrid.appendChild(bookcase);
    }
}

// 处理文件选择
function handleFileSelection() {
    const fileInput = document.getElementById('comic-file');
    const fileInfo = document.getElementById('file-info');
    const fileName = document.getElementById('file-name');
    const fileSize = document.getElementById('file-size');
    const filePreview = document.getElementById('file-preview');
    
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        if (fileName) fileName.textContent = `文件名: ${file.name}`;
        if (fileSize) fileSize.textContent = `文件大小: ${(file.size / 1024 / 1024).toFixed(2)} MB`;
        
        // 显示文件预览
        if (filePreview) {
            filePreview.innerHTML = '';
            
            if (file.type.startsWith('image/')) {
                const img = document.createElement('img');
                img.src = URL.createObjectURL(file);
                img.className = 'file-preview';
                filePreview.appendChild(img);
            } else if (file.name.endsWith('.pdf')) {
                const pdfIcon = document.createElement('div');
                pdfIcon.className = 'file-preview';
                pdfIcon.style.display = 'flex';
                pdfIcon.style.alignItems = 'center';
                pdfIcon.style.justifyContent = 'center';
                pdfIcon.style.height = '150px';
                pdfIcon.style.background = '#f8f9fa';
                pdfIcon.style.borderRadius = '8px';
                pdfIcon.innerHTML = '<div style="font-size: 3rem;">📄</div>';
                filePreview.appendChild(pdfIcon);
            } else if (file.name.endsWith('.zip')) {
                const zipIcon = document.createElement('div');
                zipIcon.className = 'file-preview';
                zipIcon.style.display = 'flex';
                zipIcon.style.alignItems = 'center';
                zipIcon.style.justifyContent = 'center';
                zipIcon.style.height = '150px';
                zipIcon.style.background = '#f8f9fa';
                zipIcon.style.borderRadius = '8px';
                zipIcon.innerHTML = '<div style="font-size: 3rem;">📦</div>';
                filePreview.appendChild(zipIcon);
            }
        }
        
        if (fileInfo) fileInfo.style.display = 'block';
    }
}

// 上传漫画
async function uploadComic() {
    const fileInput = document.getElementById('comic-file');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('upload-progress');
    const progressText = document.getElementById('progress-text');
    const uploadBtn = document.getElementById('upload-btn');
    
    if (!fileInput.files.length || !selectedBookcase) {
        alert('请选择书柜和文件');
        return;
    }
    
    const file = fileInput.files[0];
    
    // 检查文件类型
    if (!file.name.toLowerCase().endsWith('.pdf') && !file.name.toLowerCase().endsWith('.zip')) {
        alert('仅支持PDF和ZIP格式的文件');
        return;
    }
    
    // 显示进度条
    if (progressContainer) progressContainer.style.display = 'block';
    
    // 禁用上传按钮
    if (uploadBtn) {
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<span class="loading-spinner"></span> 上传中...';
    }
    
    try {
        // 使用GoFile上传文件
        const result = await uploadToGoFile(file, (progress) => {
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `上传中: ${progress}%`;
        });
        
        if (result.directLink) {
            // 上传成功，存储文件信息
            const bookcaseFiles = JSON.parse(localStorage.getItem(`bookcase_${selectedBookcase}_files`) || '[]');
            bookcaseFiles.push({
                fileId: result.fileId,
                name: result.fileName,
                directLink: result.directLink
            });
            localStorage.setItem(`bookcase_${selectedBookcase}_files`, JSON.stringify(bookcaseFiles));
            
            // 生成新密码
            const newPassword = generateRandomPassword();
            
            // 更新书柜密码
            await updateBookcasePassword(selectedBookcase, newPassword);
            
            // 通过Ably发布新密码
            publishNewPassword(selectedBookcase, newPassword);
            
            // 显示成功消息
            const selectedBookcaseEl = document.getElementById('selected-bookcase');
            if (selectedBookcaseEl) selectedBookcaseEl.textContent = selectedBookcase;
            
            const newPasswordEl = document.getElementById('new-password');
            if (newPasswordEl) newPasswordEl.textContent = newPassword;
            
            const successMessage = document.getElementById('success-message');
            if (successMessage) successMessage.style.display = 'block';
            
            // 隐藏上传表单
            const fileInfo = document.getElementById('file-info');
            if (fileInfo) fileInfo.style.display = 'none';
            
            if (progressContainer) progressContainer.style.display = 'none';
            
            // 重置文件输入
            fileInput.value = '';
            
            // 重置上传按钮
            if (uploadBtn) {
                uploadBtn.disabled = false;
                uploadBtn.textContent = '上传漫画';
            }
        } else {
            throw new Error('上传失败：未获取到直接链接');
        }
    } catch (error) {
        console.error('上传错误:', error);
        alert('上传失败: ' + error.message);
        if (progressContainer) progressContainer.style.display = 'none';
        
        // 重置上传按钮
        if (uploadBtn) {
            uploadBtn.disabled = false;
            uploadBtn.textContent = '上传漫画';
        }
    }
}

// 验证密码
async function verifyPassword() {
    const passwordInput = document.getElementById('password-input');
    const password = passwordInput ? passwordInput.value : '';
    const errorMessage = document.getElementById('error-message');
    const verifyBtn = document.getElementById('verify-btn');
    
    // 验证密码格式
    if (!/^[A-Za-z0-9]{6}$/.test(password)) {
        if (errorMessage) {
            errorMessage.textContent = "密码必须是6位字母或数字组合";
            errorMessage.style.display = 'block';
        }
        return;
    }
    
    if (!password || !selectedBookcase) {
        alert('请选择书柜并输入密码');
        return;
    }
    
    // 禁用验证按钮
    if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = '<span class="loading-spinner"></span> 验证中...';
    }
    
    try {
        // 获取书柜密码
        const storedPassword = await getBookcasePassword(selectedBookcase);
        
        if (password === storedPassword) {
            // 密码正确，隐藏错误消息
            if (errorMessage) errorMessage.style.display = 'none';
            
            // 显示漫画查看器
            const passwordSection = document.getElementById('password-section');
            if (passwordSection) passwordSection.style.display = 'none';
            
            const comicViewer = document.getElementById('comic-viewer');
            if (comicViewer) comicViewer.style.display = 'block';
            
            // 启用键盘导航
            enableKeyboardNavigation();
            
            // 获取书柜中的漫画
            const comics = await getComicsInBookcase(selectedBookcase);
            
            if (comics.length > 0) {
                // 显示第一个漫画
                currentComic = comics[0];
                displayComic(currentComic);
                
                // 显示当前密码
                const currentPasswordEl = document.getElementById('current-password');
                if (currentPasswordEl) currentPasswordEl.textContent = storedPassword;
                
                // 订阅密码更新
                subscribeToPasswordUpdates(selectedBookcase, (message) => {
                    const newPassword = message.data;
                    currentBookcasePassword = newPassword;
                    
                    const currentPasswordEl = document.getElementById('current-password');
                    if (currentPasswordEl) currentPasswordEl.textContent = newPassword;
                    
                    const updateIndicator = document.getElementById('password-update-indicator');
                    if (updateIndicator) {
                        updateIndicator.style.display = 'inline-block';
                        updateIndicator.textContent = '(已更新)';
                    }
                    
                    // 更新本地存储
                    localStorage.setItem(`bookcase_${selectedBookcase}_password`, newPassword);
                    
                    // 5秒后隐藏更新指示器
                    setTimeout(() => {
                        const updateIndicator = document.getElementById('password-update-indicator');
                        if (updateIndicator) updateIndicator.style.display = 'none';
                    }, 5000);
                });
            } else {
                alert('该书柜中没有漫画');
                closeViewer();
            }
        } else {
            // 密码错误
            if (errorMessage) {
                errorMessage.textContent = "密码错误，请重新输入";
                errorMessage.style.display = 'block';
            }
            if (passwordInput) {
                passwordInput.value = '';
                passwordInput.focus();
            }
        }
    } catch (error) {
        console.error('验证密码错误:', error);
        alert('验证失败，请重试');
    } finally {
        // 重置验证按钮
        if (verifyBtn) {
            verifyBtn.disabled = false;
            verifyBtn.textContent = '验证密码';
        }
    }
}

// 显示漫画
function displayComic(comic) {
    const comicTitle = document.getElementById('comic-title');
    const pdfViewer = document.getElementById('pdf-viewer');
    const zipViewer = document.getElementById('zip-viewer');
    
    if (comicTitle) comicTitle.textContent = comic.name;
    
    if (comic.format === 'pdf') {
        if (pdfViewer) pdfViewer.style.display = 'block';
        if (zipViewer) zipViewer.style.display = 'none';
        displayPDF(comic.url);
    } else if (comic.format === 'zip') {
        if (pdfViewer) pdfViewer.style.display = 'none';
        if (zipViewer) zipViewer.style.display = 'block';
        displayZIP(comic.url);
    }
    
    // 重置页面和缩放
    currentPage = 1;
    currentZoom = 1.0;
    currentRotation = 0;
    updateComicDisplay();
    updateReaderProgress();
}

// 更新漫画显示
function updateComicDisplay() {
    const pageCounter = document.getElementById('page-counter');
    const zoomPercent = document.getElementById('zoom-percent');
    
    if (pageCounter) pageCounter.textContent = `${currentPage}/${totalPages}`;
    if (zoomPercent) zoomPercent.textContent = `${Math.round(currentZoom * 100)}%`;
    
    // 更新按钮状态
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
    
    // 应用缩放和旋转
    const canvas = document.getElementById('pdf-canvas');
    const image = document.getElementById('comic-image');
    
    if (canvas) {
        canvas.style.transform = `scale(${currentZoom}) rotate(${currentRotation}deg)`;
    }
    
    if (image) {
        image.style.transform = `scale(${currentZoom}) rotate(${currentRotation}deg)`;
    }
    
    // 更新当前页面
    if (currentComic && currentComic.format === 'pdf') {
        // PDF需要重新渲染当前页面
        const pdfViewer = document.getElementById('pdf-viewer');
        if (pdfViewer && pdfViewer.style.display === 'block') {
            displayCurrentPDFPage();
        }
    } else if (currentComic && currentComic.format === 'zip') {
        // ZIP需要显示当前页
        if (currentComic.pages && currentComic.pages[currentPage - 1]) {
            displayImage(currentComic.pages[currentPage - 1]);
        }
    }
}

// 切换全屏
function toggleFullscreen() {
    const viewerContainer = document.querySelector('.viewer-container');
    
    if (!document.fullscreenElement) {
        if (viewerContainer) {
            viewerContainer.requestFullscreen().catch(err => {
                alert(`无法进入全屏模式: ${err.message}`);
            });
        }
    } else {
        document.exitFullscreen();
    }
}

// 切换夜间模式
function toggleNightMode() {
    document.body.classList.toggle('night-mode');
    const isNightMode = document.body.classList.contains('night-mode');
    localStorage.setItem('nightMode', isNightMode);
}

// 更新阅读进度
function updateReaderProgress() {
    const progressBar = document.querySelector('.reader-progress-bar');
    if (progressBar && totalPages > 0) {
        const progress = (currentPage / totalPages) * 100;
        progressBar.style.width = `${progress}%`;
    }
}

// 生成随机密码
function generateRandomPassword() {
    const charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    let password = "";
    for (let i = 0; i < 6; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
}

// 获取书柜密码
async function getBookcasePassword(bookcaseId) {
    try {
        return localStorage.getItem(`bookcase_${bookcaseId}_password`) || '123456';
    } catch (error) {
        console.error('获取书柜密码错误:', error);
        throw error;
    }
}

// 更新书柜密码
async function updateBookcasePassword(bookcaseId, newPassword) {
    try {
        // 存储到本地
        localStorage.setItem(`bookcase_${bookcaseId}_password`, newPassword);
        return true;
    } catch (error) {
        console.error('更新书柜密码错误:', error);
        throw error;
    }
}

// 检查并应用夜间模式设置
function checkNightMode() {
    const isNightMode = localStorage.getItem('nightMode') === 'true';
    if (isNightMode) {
        document.body.classList.add('night-mode');
    }
}

// 页面加载时检查夜间模式
document.addEventListener('DOMContentLoaded', checkNightMode);
