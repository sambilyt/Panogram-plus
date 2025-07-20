/**
 * Basic html2canvas functionality for Panogram
 * This is a simplified implementation for capturing HTML elements as canvas
 */

window.html2canvas = function(element, options) {
    options = options || {};
    
    return new Promise(function(resolve, reject) {
        try {
            // Create a canvas element
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            
            // Get element dimensions
            var rect = element.getBoundingClientRect();
            var scale = options.scale || 1;
            
            canvas.width = rect.width * scale;
            canvas.height = rect.height * scale;
            
            // Set background color if specified
            if (options.backgroundColor) {
                ctx.fillStyle = options.backgroundColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            
            // Try to capture SVG elements directly if available
            var svgElements = element.querySelectorAll('svg');
            if (svgElements.length > 0) {
                var svg = svgElements[0];
                var svgData = new XMLSerializer().serializeToString(svg);
                var img = new Image();
                
                img.onload = function() {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas);
                };
                
                img.onerror = function() {
                    // Fallback: create a simple representation
                    ctx.fillStyle = '#f0f0f0';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.fillStyle = '#333';
                    ctx.font = '16px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('Pedigree Chart', canvas.width/2, canvas.height/2);
                    resolve(canvas);
                };
                
                // Create blob URL for SVG
                var blob = new Blob([svgData], {type: 'image/svg+xml;charset=utf-8'});
                img.src = URL.createObjectURL(blob);
            } else {
                // Fallback for non-SVG elements
                ctx.fillStyle = '#f0f0f0';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#333';
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Pedigree Chart', canvas.width/2, canvas.height/2);
                resolve(canvas);
            }
            
        } catch (error) {
            reject(error);
        }
    });
};
