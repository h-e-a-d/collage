class CollageCreator {
    constructor() {
        console.log('CollageCreator constructor started');
        this.canvas = document.getElementById('collageCanvas');
        this.images = [];
        this.frames = [];
        this.currentLayout = 0;
        this.borderThickness = 5;
        this.format = 'A4';
        this.orientation = 'portrait';
        this.imageCount = 4;
        this.exportFormat = 'png';
        this.dragState = null;
        
        console.log('Canvas element:', this.canvas);
        
        this.initializeEventListeners();
        this.updateCanvas();
        this.generateLayoutOptions();
        console.log('CollageCreator constructor completed');
    }
    
    initializeEventListeners() {
        // Format change
        document.getElementById('format').addEventListener('change', (e) => {
            this.format = e.target.value;
            this.updateCanvas();
        });
        
        // Orientation change
        document.getElementById('orientation').addEventListener('change', (e) => {
            this.orientation = e.target.value;
            this.updateCanvas();
        });
        
        // Image count change
        document.getElementById('imageCount').addEventListener('change', (e) => {
            this.imageCount = parseInt(e.target.value);
            this.updateCanvas();
            this.generateLayoutOptions();
        });
        
        // Border thickness change
        document.getElementById('borderThickness').addEventListener('input', (e) => {
            this.borderThickness = parseInt(e.target.value);
            document.getElementById('borderValue').textContent = `${this.borderThickness}px`;
            this.updateFrames();
        });
        
        // Export format change
        document.getElementById('exportFormat').addEventListener('change', (e) => {
            this.exportFormat = e.target.value;
        });
        
        // File upload
        const fileInput = document.getElementById('imageUpload');
        fileInput.addEventListener('change', (e) => {
            console.log('File input changed:', e.target.files);
            if (e.target.files && e.target.files.length > 0) {
                this.handleImageUpload(e.target.files);
            }
        });
        
        // Make the label clickable
        const fileUploadDiv = document.querySelector('.file-upload');
        fileUploadDiv.addEventListener('click', (e) => {
            if (e.target !== fileInput) {
                fileInput.click();
            }
        });
        
        // Download button
        document.getElementById('downloadBtn').addEventListener('click', () => {
            this.downloadCollage();
        });
        
        // Canvas event listeners for pan and zoom
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
        
        // Prevent default drag behaviors on canvas
        this.canvas.addEventListener('dragover', (e) => e.preventDefault());
        this.canvas.addEventListener('drop', (e) => e.preventDefault());
    }
    
    getCanvasDimensions() {
        let baseWidth, baseHeight;
        
        if (this.format === 'A4') {
            if (this.orientation === 'portrait') {
                baseWidth = 800;
                baseHeight = 800 * (297/210); // A4 portrait ratio
            } else {
                baseWidth = 1000;
                baseHeight = 1000 * (210/297); // A4 landscape ratio
            }
        } else { // A3
            if (this.orientation === 'portrait') {
                baseWidth = 1000;
                baseHeight = 1000 * (420/297); // A3 portrait ratio
            } else {
                baseWidth = 1200;
                baseHeight = 1200 * (297/420); // A3 landscape ratio
            }
        }
        
        return {
            width: baseWidth,
            height: baseHeight
        };
    }
    
    updateCanvas() {
        const dimensions = this.getCanvasDimensions();
        this.canvas.style.width = `${dimensions.width}px`;
        this.canvas.style.height = `${dimensions.height}px`;
        this.generateFrames();
    }
    
    generateFrames() {
        // Save existing images and their transforms before clearing frames
        const existingFrameData = this.frames.map(frame => ({
            image: frame.image,
            scale: frame.scale,
            offsetX: frame.offsetX,
            offsetY: frame.offsetY
        })).filter(data => data.image !== null);
        
        // Clear existing frames
        this.canvas.innerHTML = '';
        this.frames = [];
        
        const dimensions = this.getCanvasDimensions();
        const layouts = this.getLayoutPatterns();
        const pattern = layouts[this.imageCount][this.currentLayout] || layouts[this.imageCount][0];
        
        pattern.forEach((frameData, index) => {
            const frame = document.createElement('div');
            frame.className = 'image-frame';
            frame.dataset.index = index;
            
            const x = frameData.x * dimensions.width;
            const y = frameData.y * dimensions.height;
            const width = frameData.width * dimensions.width;
            const height = frameData.height * dimensions.height;
            
            frame.style.position = 'absolute';
            frame.style.left = `${x + this.borderThickness}px`;
            frame.style.top = `${y + this.borderThickness}px`;
            frame.style.width = `${width - 2 * this.borderThickness}px`;
            frame.style.height = `${height - 2 * this.borderThickness}px`;
            frame.style.borderWidth = `${this.borderThickness}px`;
            
            frame.textContent = `Drop Image ${index + 1}`;
            
            // Add drag and drop event listeners
            frame.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                frame.style.borderColor = '#4a90e2';
                frame.style.backgroundColor = '#e3f2fd';
                frame.classList.add('drag-over');
            });
            
            frame.addEventListener('dragleave', (e) => {
                frame.style.borderColor = '#ccc';
                frame.style.backgroundColor = frame.classList.contains('has-image') ? '' : '#f0f0f0';
                frame.classList.remove('drag-over');
            });
            
            frame.addEventListener('drop', (e) => {
                e.preventDefault();
                frame.style.borderColor = '#ccc';
                frame.style.backgroundColor = frame.classList.contains('has-image') ? '' : '#f0f0f0';
                frame.classList.remove('drag-over');
                
                const imageIndex = e.dataTransfer.getData('text/plain');
                if (imageIndex !== '' && !isNaN(imageIndex)) {
                    const imgIdx = parseInt(imageIndex);
                    if (imgIdx >= 0 && imgIdx < this.images.length) {
                        this.assignImageToSpecificFrame(this.images[imgIdx], imgIdx, index);
                    }
                }
            });
            
            this.canvas.appendChild(frame);
            this.frames.push({
                element: frame,
                image: null,
                scale: 1,
                offsetX: 0,
                offsetY: 0,
                frameRect: {
                    x: x + this.borderThickness,
                    y: y + this.borderThickness,
                    width: width - 2 * this.borderThickness,
                    height: height - 2 * this.borderThickness
                }
            });
        });
        
        // Restore existing images to available frames with their transforms
        existingFrameData.forEach((data, index) => {
            if (index < this.frames.length) {
                const frame = this.frames[index];
                frame.image = data.image;
                frame.scale = data.scale;
                frame.offsetX = data.offsetX;
                frame.offsetY = data.offsetY;
                
                frame.element.innerHTML = '';
                frame.element.classList.add('has-image');
                frame.element.textContent = '';
                
                const frameImg = document.createElement('img');
                frameImg.src = data.image.src;
                frameImg.className = 'frame-image';
                frameImg.draggable = false;
                
                // Add zoom controls
                const zoomControls = document.createElement('div');
                zoomControls.className = 'zoom-controls';
                
                const zoomInBtn = document.createElement('div');
                zoomInBtn.className = 'zoom-btn';
                zoomInBtn.innerHTML = '+';
                zoomInBtn.title = 'Zoom in';
                zoomInBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    frame.scale = Math.min(3, frame.scale * 1.05);
                    this.updateImageTransform(frame);
                });
                
                const zoomOutBtn = document.createElement('div');
                zoomOutBtn.className = 'zoom-btn';
                zoomOutBtn.innerHTML = '−';
                zoomOutBtn.title = 'Zoom out';
                zoomOutBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    frame.scale = Math.max(0.1, frame.scale * 0.95);
                    this.updateImageTransform(frame);
                });
                
                zoomControls.appendChild(zoomInBtn);
                zoomControls.appendChild(zoomOutBtn);
                
                // Add remove button
                const removeBtn = document.createElement('div');
                removeBtn.className = 'remove-btn';
                removeBtn.innerHTML = '×';
                removeBtn.title = 'Remove image';
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.removeImageFromFrame(frame);
                });
                
                frame.element.appendChild(frameImg);
                frame.element.appendChild(zoomControls);
                frame.element.appendChild(removeBtn);
                this.updateImageTransform(frame);
            }
        });
    }
    
    updateFrames() {
        // Simply regenerate frames with correct border thickness
        this.generateFrames();
    }
    
    getLayoutPatterns() {
        return {
            1: [
                [{ x: 0, y: 0, width: 1, height: 1 }]
            ],
            2: [
                [
                    { x: 0, y: 0, width: 0.7, height: 1 },
                    { x: 0.7, y: 0, width: 0.3, height: 1 }
                ],
                [
                    { x: 0, y: 0, width: 1, height: 0.6 },
                    { x: 0, y: 0.6, width: 1, height: 0.4 }
                ],
                [
                    { x: 0, y: 0, width: 0.3, height: 1 },
                    { x: 0.3, y: 0, width: 0.7, height: 1 }
                ]
            ],
            3: [
                [
                    { x: 0, y: 0, width: 0.6, height: 0.7 },
                    { x: 0.6, y: 0, width: 0.4, height: 0.4 },
                    { x: 0.6, y: 0.4, width: 0.4, height: 0.6 }
                ],
                [
                    { x: 0, y: 0, width: 1, height: 0.4 },
                    { x: 0, y: 0.4, width: 0.5, height: 0.6 },
                    { x: 0.5, y: 0.4, width: 0.5, height: 0.6 }
                ],
                [
                    { x: 0, y: 0, width: 0.4, height: 0.6 },
                    { x: 0, y: 0.6, width: 0.4, height: 0.4 },
                    { x: 0.4, y: 0, width: 0.6, height: 1 }
                ]
            ],
            4: [
                [
                    { x: 0, y: 0, width: 0.6, height: 0.6 },
                    { x: 0.6, y: 0, width: 0.4, height: 0.3 },
                    { x: 0.6, y: 0.3, width: 0.4, height: 0.3 },
                    { x: 0, y: 0.6, width: 1, height: 0.4 }
                ],
                [
                    { x: 0, y: 0, width: 1, height: 0.35 },
                    { x: 0, y: 0.35, width: 0.3, height: 0.65 },
                    { x: 0.3, y: 0.35, width: 0.45, height: 0.65 },
                    { x: 0.75, y: 0.35, width: 0.25, height: 0.65 }
                ],
                [
                    { x: 0, y: 0, width: 0.35, height: 0.5 },
                    { x: 0.35, y: 0, width: 0.65, height: 0.5 },
                    { x: 0, y: 0.5, width: 0.5, height: 0.5 },
                    { x: 0.5, y: 0.5, width: 0.5, height: 0.5 }
                ]
            ],
            6: [
                [
                    { x: 0, y: 0, width: 0.5, height: 0.6 },
                    { x: 0.5, y: 0, width: 0.25, height: 0.3 },
                    { x: 0.75, y: 0, width: 0.25, height: 0.3 },
                    { x: 0.5, y: 0.3, width: 0.5, height: 0.3 },
                    { x: 0, y: 0.6, width: 0.4, height: 0.4 },
                    { x: 0.4, y: 0.6, width: 0.6, height: 0.4 }
                ],
                [
                    { x: 0, y: 0, width: 0.4, height: 1 },
                    { x: 0.4, y: 0, width: 0.3, height: 0.33 },
                    { x: 0.7, y: 0, width: 0.3, height: 0.33 },
                    { x: 0.4, y: 0.33, width: 0.6, height: 0.34 },
                    { x: 0.4, y: 0.67, width: 0.3, height: 0.33 },
                    { x: 0.7, y: 0.67, width: 0.3, height: 0.33 }
                ]
            ],
            8: [
                [
                    { x: 0, y: 0, width: 0.4, height: 0.6 },
                    { x: 0.4, y: 0, width: 0.3, height: 0.3 },
                    { x: 0.7, y: 0, width: 0.3, height: 0.3 },
                    { x: 0.4, y: 0.3, width: 0.6, height: 0.3 },
                    { x: 0, y: 0.6, width: 0.25, height: 0.4 },
                    { x: 0.25, y: 0.6, width: 0.25, height: 0.4 },
                    { x: 0.5, y: 0.6, width: 0.25, height: 0.4 },
                    { x: 0.75, y: 0.6, width: 0.25, height: 0.4 }
                ],
                [
                    { x: 0, y: 0, width: 0.6, height: 0.4 },
                    { x: 0.6, y: 0, width: 0.2, height: 0.2 },
                    { x: 0.8, y: 0, width: 0.2, height: 0.2 },
                    { x: 0.6, y: 0.2, width: 0.2, height: 0.2 },
                    { x: 0.8, y: 0.2, width: 0.2, height: 0.2 },
                    { x: 0, y: 0.4, width: 0.3, height: 0.6 },
                    { x: 0.3, y: 0.4, width: 0.35, height: 0.6 },
                    { x: 0.65, y: 0.4, width: 0.35, height: 0.6 }
                ]
            ],
            9: [
                [
                    { x: 0, y: 0, width: 0.5, height: 0.5 },
                    { x: 0.5, y: 0, width: 0.25, height: 0.25 },
                    { x: 0.75, y: 0, width: 0.25, height: 0.25 },
                    { x: 0.5, y: 0.25, width: 0.25, height: 0.25 },
                    { x: 0.75, y: 0.25, width: 0.25, height: 0.25 },
                    { x: 0, y: 0.5, width: 0.3, height: 0.5 },
                    { x: 0.3, y: 0.5, width: 0.35, height: 0.5 },
                    { x: 0.65, y: 0.5, width: 0.35, height: 0.25 },
                    { x: 0.65, y: 0.75, width: 0.35, height: 0.25 }
                ],
                [
                    { x: 0, y: 0, width: 0.4, height: 0.7 },
                    { x: 0.4, y: 0, width: 0.3, height: 0.35 },
                    { x: 0.7, y: 0, width: 0.3, height: 0.35 },
                    { x: 0.4, y: 0.35, width: 0.6, height: 0.35 },
                    { x: 0, y: 0.7, width: 0.25, height: 0.3 },
                    { x: 0.25, y: 0.7, width: 0.25, height: 0.3 },
                    { x: 0.5, y: 0.7, width: 0.2, height: 0.3 },
                    { x: 0.7, y: 0.7, width: 0.15, height: 0.3 },
                    { x: 0.85, y: 0.7, width: 0.15, height: 0.3 }
                ]
            ],
            10: [
                [
                    { x: 0, y: 0, width: 0.6, height: 0.6 },
                    { x: 0.6, y: 0, width: 0.2, height: 0.2 },
                    { x: 0.8, y: 0, width: 0.2, height: 0.2 },
                    { x: 0.6, y: 0.2, width: 0.2, height: 0.2 },
                    { x: 0.8, y: 0.2, width: 0.2, height: 0.2 },
                    { x: 0.6, y: 0.4, width: 0.4, height: 0.2 },
                    { x: 0, y: 0.6, width: 0.2, height: 0.4 },
                    { x: 0.2, y: 0.6, width: 0.2, height: 0.4 },
                    { x: 0.4, y: 0.6, width: 0.3, height: 0.4 },
                    { x: 0.7, y: 0.6, width: 0.3, height: 0.4 }
                ],
                [
                    { x: 0, y: 0, width: 0.5, height: 0.4 },
                    { x: 0.5, y: 0, width: 0.25, height: 0.2 },
                    { x: 0.75, y: 0, width: 0.25, height: 0.2 },
                    { x: 0.5, y: 0.2, width: 0.5, height: 0.2 },
                    { x: 0, y: 0.4, width: 0.2, height: 0.3 },
                    { x: 0.2, y: 0.4, width: 0.2, height: 0.3 },
                    { x: 0.4, y: 0.4, width: 0.2, height: 0.3 },
                    { x: 0.6, y: 0.4, width: 0.2, height: 0.3 },
                    { x: 0.8, y: 0.4, width: 0.2, height: 0.3 },
                    { x: 0, y: 0.7, width: 1, height: 0.3 }
                ]
            ],
            11: [
                [
                    { x: 0, y: 0, width: 0.5, height: 0.5 },
                    { x: 0.5, y: 0, width: 0.25, height: 0.25 },
                    { x: 0.75, y: 0, width: 0.25, height: 0.25 },
                    { x: 0.5, y: 0.25, width: 0.5, height: 0.25 },
                    { x: 0, y: 0.5, width: 0.2, height: 0.25 },
                    { x: 0.2, y: 0.5, width: 0.2, height: 0.25 },
                    { x: 0.4, y: 0.5, width: 0.2, height: 0.25 },
                    { x: 0.6, y: 0.5, width: 0.2, height: 0.25 },
                    { x: 0.8, y: 0.5, width: 0.2, height: 0.25 },
                    { x: 0, y: 0.75, width: 0.5, height: 0.25 },
                    { x: 0.5, y: 0.75, width: 0.5, height: 0.25 }
                ],
                [
                    { x: 0, y: 0, width: 0.4, height: 0.6 },
                    { x: 0.4, y: 0, width: 0.3, height: 0.3 },
                    { x: 0.7, y: 0, width: 0.3, height: 0.3 },
                    { x: 0.4, y: 0.3, width: 0.6, height: 0.3 },
                    { x: 0, y: 0.6, width: 0.25, height: 0.2 },
                    { x: 0.25, y: 0.6, width: 0.25, height: 0.2 },
                    { x: 0.5, y: 0.6, width: 0.25, height: 0.2 },
                    { x: 0.75, y: 0.6, width: 0.25, height: 0.2 },
                    { x: 0, y: 0.8, width: 0.2, height: 0.2 },
                    { x: 0.2, y: 0.8, width: 0.4, height: 0.2 },
                    { x: 0.6, y: 0.8, width: 0.4, height: 0.2 }
                ]
            ],
            12: [
                [
                    { x: 0, y: 0, width: 0.33, height: 0.25 },
                    { x: 0.33, y: 0, width: 0.34, height: 0.25 },
                    { x: 0.67, y: 0, width: 0.33, height: 0.25 },
                    { x: 0, y: 0.25, width: 0.33, height: 0.25 },
                    { x: 0.33, y: 0.25, width: 0.34, height: 0.25 },
                    { x: 0.67, y: 0.25, width: 0.33, height: 0.25 },
                    { x: 0, y: 0.5, width: 0.33, height: 0.25 },
                    { x: 0.33, y: 0.5, width: 0.34, height: 0.25 },
                    { x: 0.67, y: 0.5, width: 0.33, height: 0.25 },
                    { x: 0, y: 0.75, width: 0.33, height: 0.25 },
                    { x: 0.33, y: 0.75, width: 0.34, height: 0.25 },
                    { x: 0.67, y: 0.75, width: 0.33, height: 0.25 }
                ],
                [
                    { x: 0, y: 0, width: 0.5, height: 0.4 },
                    { x: 0.5, y: 0, width: 0.25, height: 0.2 },
                    { x: 0.75, y: 0, width: 0.25, height: 0.2 },
                    { x: 0.5, y: 0.2, width: 0.5, height: 0.2 },
                    { x: 0, y: 0.4, width: 0.2, height: 0.3 },
                    { x: 0.2, y: 0.4, width: 0.2, height: 0.3 },
                    { x: 0.4, y: 0.4, width: 0.2, height: 0.3 },
                    { x: 0.6, y: 0.4, width: 0.2, height: 0.3 },
                    { x: 0.8, y: 0.4, width: 0.2, height: 0.3 },
                    { x: 0, y: 0.7, width: 0.25, height: 0.3 },
                    { x: 0.25, y: 0.7, width: 0.25, height: 0.3 },
                    { x: 0.5, y: 0.7, width: 0.5, height: 0.3 }
                ],
                [
                    { x: 0, y: 0, width: 0.25, height: 0.33 },
                    { x: 0.25, y: 0, width: 0.25, height: 0.33 },
                    { x: 0.5, y: 0, width: 0.25, height: 0.33 },
                    { x: 0.75, y: 0, width: 0.25, height: 0.33 },
                    { x: 0, y: 0.33, width: 0.25, height: 0.34 },
                    { x: 0.25, y: 0.33, width: 0.25, height: 0.34 },
                    { x: 0.5, y: 0.33, width: 0.25, height: 0.34 },
                    { x: 0.75, y: 0.33, width: 0.25, height: 0.34 },
                    { x: 0, y: 0.67, width: 0.25, height: 0.33 },
                    { x: 0.25, y: 0.67, width: 0.25, height: 0.33 },
                    { x: 0.5, y: 0.67, width: 0.25, height: 0.33 },
                    { x: 0.75, y: 0.67, width: 0.25, height: 0.33 }
                ]
            ]
        };
    }
    
    generateLayoutOptions() {
        const layoutContainer = document.getElementById('layoutOptions');
        layoutContainer.innerHTML = '';
        
        const layouts = this.getLayoutPatterns()[this.imageCount];
        if (!layouts) return;
        
        layouts.forEach((layout, index) => {
            const option = document.createElement('div');
            option.className = 'layout-option';
            if (index === this.currentLayout) option.classList.add('active');
            
            // Create mini preview of layout
            layout.forEach(frame => {
                const miniFrame = document.createElement('div');
                miniFrame.style.position = 'absolute';
                miniFrame.style.left = `${frame.x * 100}%`;
                miniFrame.style.top = `${frame.y * 100}%`;
                miniFrame.style.width = `${frame.width * 100}%`;
                miniFrame.style.height = `${frame.height * 100}%`;
                miniFrame.style.background = '#4a90e2';
                miniFrame.style.border = '1px solid white';
                option.appendChild(miniFrame);
            });
            
            option.addEventListener('click', () => {
                document.querySelectorAll('.layout-option').forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
                this.currentLayout = index;
                this.generateFrames();
            });
            
            layoutContainer.appendChild(option);
        });
    }
    
    handleImageUpload(files) {
        console.log('Handling image upload:', files.length, 'files');
        Array.from(files).forEach((file, index) => {
            console.log('Processing file:', file.name, file.type);
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    console.log('File loaded successfully');
                    const img = new Image();
                    img.onload = () => {
                        console.log('Image created:', img.src.substring(0, 50) + '...');
                        this.images.push(img);
                        this.updateImageGrid();
                    };
                    img.onerror = (error) => {
                        console.error('Error loading image:', error);
                    };
                    img.src = e.target.result;
                };
                reader.onerror = (error) => {
                    console.error('Error reading file:', error);
                };
                reader.readAsDataURL(file);
            } else {
                console.log('Skipping non-image file:', file.name);
            }
        });
    }
    
    updateImageGrid() {
        console.log('Updating image grid with', this.images.length, 'images');
        const grid = document.getElementById('imageGrid');
        grid.innerHTML = '';
        
        this.images.forEach((img, index) => {
            const thumbnail = document.createElement('img');
            thumbnail.src = img.src;
            thumbnail.className = 'image-thumbnail';
            thumbnail.draggable = true;
            thumbnail.dataset.imageIndex = index;
            
            // Add drag start event
            thumbnail.addEventListener('dragstart', (e) => {
                console.log('Drag started for image', index);
                e.dataTransfer.setData('text/plain', index.toString());
                e.dataTransfer.effectAllowed = 'copy';
                thumbnail.style.opacity = '0.5';
            });
            
            thumbnail.addEventListener('dragend', (e) => {
                console.log('Drag ended for image', index);
                thumbnail.style.opacity = '1';
            });
            
            thumbnail.addEventListener('click', () => {
                console.log('Thumbnail clicked for image', index);
                this.assignImageToFrame(img, index);
            });
            
            grid.appendChild(thumbnail);
        });
    }
    
    assignImageToFrame(img, imgIndex) {
        console.log('Assigning image to first available frame');
        const emptyFrame = this.frames.find(frame => !frame.image);
        if (emptyFrame) {
            this.setImageToFrame(img, emptyFrame);
        } else {
            console.log('No empty frames available');
        }
    }
    
    assignImageToSpecificFrame(img, imgIndex, frameIndex) {
        console.log('Assigning image', imgIndex, 'to specific frame', frameIndex);
        if (frameIndex < this.frames.length) {
            this.setImageToFrame(img, this.frames[frameIndex]);
        } else {
            console.log('Invalid frame index:', frameIndex);
        }
    }
    
    setImageToFrame(img, frame) {
        console.log('Setting image to frame');
        frame.image = img;
        
        // Calculate initial scale to fit the image properly in the frame
        const frameRect = frame.frameRect;
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const frameAspect = frameRect.width / frameRect.height;
        
        // Calculate scale to fit the entire image in the frame (like object-fit: contain)
        let initialScale;
        if (imgAspect > frameAspect) {
            // Image is wider - scale to fit width
            initialScale = 1;
        } else {
            // Image is taller - scale to fit height  
            initialScale = 1;
        }
        
        frame.scale = initialScale;
        frame.offsetX = 0;
        frame.offsetY = 0;
        
        frame.element.innerHTML = '';
        frame.element.classList.add('has-image');
        frame.element.textContent = '';
        
        const frameImg = document.createElement('img');
        frameImg.src = img.src;
        frameImg.className = 'frame-image';
        frameImg.draggable = false;
        
        // Add zoom controls
        const zoomControls = document.createElement('div');
        zoomControls.className = 'zoom-controls';
        
        const zoomInBtn = document.createElement('div');
        zoomInBtn.className = 'zoom-btn';
        zoomInBtn.innerHTML = '+';
        zoomInBtn.title = 'Zoom in';
        zoomInBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            frame.scale = Math.min(3, frame.scale * 1.05);
            this.updateImageTransform(frame);
        });
        
        const zoomOutBtn = document.createElement('div');
        zoomOutBtn.className = 'zoom-btn';
        zoomOutBtn.innerHTML = '−';
        zoomOutBtn.title = 'Zoom out';
        zoomOutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            frame.scale = Math.max(0.1, frame.scale * 0.95);
            this.updateImageTransform(frame);
        });
        
        zoomControls.appendChild(zoomInBtn);
        zoomControls.appendChild(zoomOutBtn);
        
        // Add remove button
        const removeBtn = document.createElement('div');
        removeBtn.className = 'remove-btn';
        removeBtn.innerHTML = '×';
        removeBtn.title = 'Remove image';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeImageFromFrame(frame);
        });
        
        frame.element.appendChild(frameImg);
        frame.element.appendChild(zoomControls);
        frame.element.appendChild(removeBtn);
        this.updateImageTransform(frame);
        console.log('Image successfully set to frame');
    }
    
    removeImageFromFrame(frame) {
        console.log('Removing image from frame');
        frame.image = null;
        frame.scale = 1;
        frame.offsetX = 0;
        frame.offsetY = 0;
        
        frame.element.innerHTML = '';
        frame.element.classList.remove('has-image');
        
        const frameIndex = this.frames.indexOf(frame);
        frame.element.textContent = `Drop Image ${frameIndex + 1}`;
        console.log('Image removed from frame');
    }
    
    updateImageTransform(frame) {
        if (frame.image && frame.element.querySelector('.frame-image')) {
            const img = frame.element.querySelector('.frame-image');
            img.style.transform = `scale(${frame.scale}) translate(${frame.offsetX}px, ${frame.offsetY}px)`;
        }
    }
    
    handleMouseDown(e) {
        // Don't start dragging if clicking on control buttons
        if (e.target.classList.contains('remove-btn') || 
            e.target.classList.contains('zoom-btn') ||
            e.target.closest('.zoom-controls')) {
            return;
        }
        
        const frame = e.target.closest('.image-frame');
        if (frame && frame.classList.contains('has-image')) {
            this.dragState = {
                frame: this.frames[parseInt(frame.dataset.index)],
                startX: e.clientX,
                startY: e.clientY,
                startOffsetX: this.frames[parseInt(frame.dataset.index)].offsetX,
                startOffsetY: this.frames[parseInt(frame.dataset.index)].offsetY
            };
            e.preventDefault();
        }
    }
    
    handleMouseMove(e) {
        if (this.dragState) {
            const deltaX = e.clientX - this.dragState.startX;
            const deltaY = e.clientY - this.dragState.startY;
            
            this.dragState.frame.offsetX = this.dragState.startOffsetX + deltaX / this.dragState.frame.scale;
            this.dragState.frame.offsetY = this.dragState.startOffsetY + deltaY / this.dragState.frame.scale;
            
            this.updateImageTransform(this.dragState.frame);
            e.preventDefault();
        }
    }
    
    handleMouseUp() {
        this.dragState = null;
    }
    
    handleWheel(e) {
        // Don't zoom if hovering over control buttons
        if (e.target.classList.contains('remove-btn') || 
            e.target.classList.contains('zoom-btn') ||
            e.target.closest('.zoom-controls')) {
            return;
        }
        
        const frame = e.target.closest('.image-frame');
        if (frame && frame.classList.contains('has-image')) {
            e.preventDefault();
            const frameData = this.frames[parseInt(frame.dataset.index)];
            const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
            frameData.scale = Math.max(0.1, Math.min(3, frameData.scale * scaleFactor));
            this.updateImageTransform(frameData);
        }
    }
    
    downloadCollage() {
        if (this.exportFormat === 'pdf') {
            this.downloadCollagePDF();
        } else {
            this.downloadCollageImage();
        }
    }
    
    downloadCollageImage() {
        // Create a temporary canvas for export
        const exportCanvas = document.createElement('canvas');
        const ctx = exportCanvas.getContext('2d');
        const dimensions = this.getCanvasDimensions();
        
        // Set high resolution for better quality
        const scale = 2;
        exportCanvas.width = dimensions.width * scale;
        exportCanvas.height = dimensions.height * scale;
        ctx.scale(scale, scale);
        
        // Fill background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, dimensions.width, dimensions.height);
        
        // Draw each frame
        this.frames.forEach(frame => {
            if (frame.image) {
                const frameRect = frame.frameRect;
                
                ctx.save();
                ctx.beginPath();
                ctx.rect(frameRect.x, frameRect.y, frameRect.width, frameRect.height);
                ctx.clip();
                
                // Calculate center of frame
                const centerX = frameRect.x + frameRect.width / 2;
                const centerY = frameRect.y + frameRect.height / 2;
                
                // Move to center of frame
                ctx.translate(centerX, centerY);
                
                // Apply scale and offset transforms
                ctx.scale(frame.scale, frame.scale);
                ctx.translate(frame.offsetX, frame.offsetY);
                
                // Calculate image dimensions to fit in frame (contain behavior like CSS)
                const imgAspect = frame.image.naturalWidth / frame.image.naturalHeight;
                const frameAspect = frameRect.width / frameRect.height;
                
                let drawWidth, drawHeight;
                if (imgAspect > frameAspect) {
                    // Image is wider than frame - fit to width
                    drawWidth = frameRect.width;
                    drawHeight = drawWidth / imgAspect;
                } else {
                    // Image is taller than frame - fit to height
                    drawHeight = frameRect.height;
                    drawWidth = drawHeight * imgAspect;
                }
                
                // Draw image centered
                ctx.drawImage(frame.image, -drawWidth/2, -drawHeight/2, drawWidth, drawHeight);
                ctx.restore();
            }
        });
        
        // Determine file format and quality
        let mimeType = 'image/png';
        let quality = 1.0;
        let extension = 'png';
        
        if (this.exportFormat === 'jpeg') {
            mimeType = 'image/jpeg';
            quality = 1.0; // Maximum quality for near-lossless JPEG
            extension = 'jpg';
        }
        
        // Download
        const link = document.createElement('a');
        link.download = `collage_${this.format}_${this.orientation}_${Date.now()}.${extension}`;
        link.href = exportCanvas.toDataURL(mimeType, quality);
        link.click();
    }
    
    downloadCollagePDF() {
        // Create a temporary canvas for export
        const exportCanvas = document.createElement('canvas');
        const ctx = exportCanvas.getContext('2d');
        const dimensions = this.getCanvasDimensions();
        
        // Set high resolution for better quality
        const scale = 3; // Higher resolution for PDF
        exportCanvas.width = dimensions.width * scale;
        exportCanvas.height = dimensions.height * scale;
        ctx.scale(scale, scale);
        
        // Fill background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, dimensions.width, dimensions.height);
        
        // Draw each frame
        this.frames.forEach(frame => {
            if (frame.image) {
                const frameRect = frame.frameRect;
                
                ctx.save();
                ctx.beginPath();
                ctx.rect(frameRect.x, frameRect.y, frameRect.width, frameRect.height);
                ctx.clip();
                
                // Calculate center of frame
                const centerX = frameRect.x + frameRect.width / 2;
                const centerY = frameRect.y + frameRect.height / 2;
                
                // Move to center of frame
                ctx.translate(centerX, centerY);
                
                // Apply scale and offset transforms
                ctx.scale(frame.scale, frame.scale);
                ctx.translate(frame.offsetX, frame.offsetY);
                
                // Calculate image dimensions to fit in frame (contain behavior like CSS)
                const imgAspect = frame.image.naturalWidth / frame.image.naturalHeight;
                const frameAspect = frameRect.width / frameRect.height;
                
                let drawWidth, drawHeight;
                if (imgAspect > frameAspect) {
                    // Image is wider than frame - fit to width
                    drawWidth = frameRect.width;
                    drawHeight = drawWidth / imgAspect;
                } else {
                    // Image is taller than frame - fit to height
                    drawHeight = frameRect.height;
                    drawWidth = drawHeight * imgAspect;
                }
                
                // Draw image centered
                ctx.drawImage(frame.image, -drawWidth/2, -drawHeight/2, drawWidth, drawHeight);
                ctx.restore();
            }
        });
        
        // Convert canvas to image data
        const imgData = exportCanvas.toDataURL('image/jpeg', 1.0);
        
        // Create PDF
        const { jsPDF } = window.jspdf;
        
        // Calculate PDF dimensions based on format and orientation
        let pdfWidth, pdfHeight;
        if (this.format === 'A4') {
            if (this.orientation === 'portrait') {
                pdfWidth = 210; // A4 width in mm
                pdfHeight = 297; // A4 height in mm
            } else {
                pdfWidth = 297; // A4 height in mm (landscape)
                pdfHeight = 210; // A4 width in mm (landscape)
            }
        } else { // A3
            if (this.orientation === 'portrait') {
                pdfWidth = 297; // A3 width in mm
                pdfHeight = 420; // A3 height in mm
            } else {
                pdfWidth = 420; // A3 height in mm (landscape)
                pdfHeight = 297; // A3 width in mm (landscape)
            }
        }
        
        const pdf = new jsPDF({
            orientation: this.orientation === 'portrait' ? 'p' : 'l',
            unit: 'mm',
            format: this.format.toLowerCase()
        });
        
        // Add the image to PDF, filling the entire page
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        
        // Download PDF
        pdf.save(`collage_${this.format}_${this.orientation}_${Date.now()}.pdf`);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing CollageCreator');
    try {
        const collageApp = new CollageCreator();
        console.log('CollageCreator initialized successfully');
        window.collageApp = collageApp; // Make it accessible for debugging
    } catch (error) {
        console.error('Error initializing CollageCreator:', error);
    }
});
