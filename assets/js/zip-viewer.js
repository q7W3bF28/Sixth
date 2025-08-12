let currentImageUrl = null;

// 显示ZIP文件中的图像
async function displayZIP(zipUrl) {
    try {
        // 获取ZIP文件
        const response = await fetch(zipUrl);
        const blob = await response.blob();
        
        // 解压ZIP文件
        const zip = await JSZip.loadAsync(blob);
        
        // 获取所有图像文件
        const imageFiles = [];
        zip.forEach((relativePath, file) => {
            if (!file.dir && (file.name.toLowerCase().endsWith('.jpg') || 
                file.name.toLowerCase().endsWith('.jpeg') || 
                file.name.toLowerCase().endsWith('.png') ||
                file.name.toLowerCase().endsWith('.webp'))) {
                imageFiles.push(file);
            }
        });
        
        // 按文件名排序
        imageFiles.sort((a, b) => a.name.localeCompare(b.name));
        
        // 存储页面数据
        currentComic.pages = imageFiles;
        
        // 设置总页数
        totalPages = imageFiles.length;
        
        // 显示第一张图像
        if (totalPages > 0) {
            await displayImage(imageFiles[0]);
        } else {
            alert('ZIP文件中没有找到图像');
        }
    } catch (error) {
        console.error('处理ZIP文件错误:', error);
        alert('无法处理ZIP文件');
    }
}

// 显示图像
async function displayImage(imageFile) {
    try {
        // 释放之前的URL
        if (currentImageUrl) {
            URL.revokeObjectURL(currentImageUrl);
        }
        
        // 获取图像数据
        const imageData = await imageFile.async('blob');
        const imageUrl = URL.createObjectURL(imageData);
        currentImageUrl = imageUrl;
        
        // 设置图像源
        const image = document.getElementById('comic-image');
        if (!image) return;
        
        image.src = imageUrl;
        
        // 应用缩放和旋转
        image.style.transform = `scale(${currentZoom}) rotate(${currentRotation}deg)`;
        
        // 预加载下一张图片
        preloadNextImage();
    } catch (error) {
        console.error('显示图像错误:', error);
    }
}

// 预加载下一张图片
function preloadNextImage() {
    if (!currentComic || !currentComic.pages || currentPage >= totalPages) return;
    
    const nextImageFile = currentComic.pages[currentPage];
    if (!nextImageFile) return;
    
    // 异步预加载
    nextImageFile.async('blob').then(blob => {
        const url = URL.createObjectURL(blob);
        // 创建但不显示
        const img = new Image();
        img.src = url;
        // 稍后释放URL
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
}

// 适应屏幕
function fitImageToScreen() {
    const image = document.getElementById('comic-image');
    const container = document.querySelector('.viewer-container');
    
    if (!image || !container || !image.naturalWidth) return;
    
    const containerWidth = container.clientWidth - 40;
    const containerHeight = container.clientHeight - 40;
    
    // 计算适合的缩放比例
    const scaleX = containerWidth / image.naturalWidth;
    const scaleY = containerHeight / image.naturalHeight;
    const scale = Math.min(scaleX, scaleY);
    
    currentZoom = scale;
    updateComicDisplay();
}
