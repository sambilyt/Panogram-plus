/**
 * Visual Export functionality for Panogram Pedigree Editor
 * Supports export to SVG, PNG, PDF, HTML, and JPG formats
 * 
 * @class VisualExport
 */

var VisualExport = Class.create({
    
    initialize: function() {
        // Will be initialized when needed
    }
});

VisualExport.prototype = {};

/**
 * Extract phenotype/disease information from the current pedigree
 * @returns {Object} - Contains disease information and affected individuals
 */
VisualExport.extractPhenotypeInfo = function() {
    try {
        var phenotypes = {};
        var carrierStatusCounts = {
            'normal': 0,
            'carrier': 0,
            'affected': 0,
            'presymptomatic': 0
        };
        var totalIndividuals = 0;
        
        if (editor && editor.getGraph && editor.getGraph()) {
            var graph = editor.getGraph();
            
            // Iterate through all persons in the pedigree
            for (var i = 0; i <= graph.getMaxRealVertexId(); i++) {
                if (graph.isPerson(i)) {
                    totalIndividuals++;
                    var properties = graph.getProperties(i);
                    
                    // Extract carrier status using actual Panogram values
                    if (properties && properties.carrierStatus) {
                        var status = properties.carrierStatus;
                        if (status === 'affected') {
                            carrierStatusCounts.affected++;
                        } else if (status === 'carrier') {
                            carrierStatusCounts.carrier++;
                        } else if (status === 'presymptomatic') {
                            carrierStatusCounts.presymptomatic++;
                        }
                    } else {
                        carrierStatusCounts.normal++;
                    }
                    
                    // Extract disorders/phenotypes
                    if (properties && properties.disorders) {
                        properties.disorders.forEach(function(disorder) {
                            var disorderName = disorder.label || disorder.id || disorder;
                            if (disorderName && typeof disorderName === 'string') {
                                if (!phenotypes[disorderName]) {
                                    phenotypes[disorderName] = 0;
                                }
                                phenotypes[disorderName]++;
                            }
                        });
                    }
                    
                    // Extract HPO terms
                    if (properties && properties.hpoTerms) {
                        properties.hpoTerms.forEach(function(hpo) {
                            var hpoName = hpo.label || hpo.id || hpo;
                            if (hpoName && typeof hpoName === 'string') {
                                if (!phenotypes[hpoName]) {
                                    phenotypes[hpoName] = 0;
                                }
                                phenotypes[hpoName]++;
                            }
                        });
                    }
                }
            }
        }
        
        return {
            phenotypes: phenotypes,
            carrierStatusCounts: carrierStatusCounts,
            affectedCount: carrierStatusCounts.affected,
            totalIndividuals: totalIndividuals,
            title: VisualExport._generatePhenotypeTitle(phenotypes, carrierStatusCounts.affected)
        };
        
    } catch (error) {
        console.error('Error extracting phenotype info:', error);
        return {
            phenotypes: {},
            carrierStatusCounts: { normal: 0, carrier: 0, affected: 0, presymptomatic: 0 },
            affectedCount: 0,
            totalIndividuals: 0,
            title: 'Pedigree Chart'
        };
    }
};

/**
 * Generate a descriptive title from phenotype data
 * @private
 */
VisualExport._generatePhenotypeTitle = function(phenotypes, affectedCount) {
    var phenotypeNames = Object.keys(phenotypes);
    
    if (phenotypeNames.length === 0) {
        return affectedCount > 0 ? 
            'Pedigree Chart (' + affectedCount + ' affected)' : 
            'Pedigree Chart';
    }
    
    // Use the most common phenotype as the main title
    var mainPhenotype = phenotypeNames.reduce(function(a, b) {
        return phenotypes[a] > phenotypes[b] ? a : b;
    });
    
    var caseText = affectedCount === 1 ? '1 case' : affectedCount + ' cases';
    return mainPhenotype + ' (' + caseText + ')';
};

/**
 * Exports the pedigree as SVG
 * @param {String} fileName - The name of the file to save
 */
VisualExport.exportAsSVG = function(fileName) {
    try {
        var paper = editor.getPaper();
        var svgElement = paper.canvas;
        var phenotypeInfo = VisualExport.extractPhenotypeInfo();
        
        // Clone the SVG element to avoid modifying the original
        var clonedSvg = svgElement.cloneNode(true);
        
        // Add proper SVG namespace and DOCTYPE
        clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
        
        // Get the full bounds to capture complete tree
        var bbox = VisualExport._calculateBounds();
        if (bbox) {
            var margin = 20;  // Standard margin around the tree
            var titleHeight = 50;
            var legendWidth = 180;
            var legendMargin = 20;  // Reduced space between tree and legend
            var totalWidth = bbox.width + (margin * 2) + legendWidth + legendMargin;
            var height = bbox.height + (margin * 2) + titleHeight;
            var x = bbox.x - margin;
            var y = bbox.y - margin - titleHeight;
            
            clonedSvg.setAttribute('viewBox', x + ' ' + y + ' ' + totalWidth + ' ' + height);
            clonedSvg.setAttribute('width', totalWidth);
            clonedSvg.setAttribute('height', height);
            
            // Add title to the SVG
            var titleGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            titleGroup.setAttribute('class', 'pedigree-title');
            
            var titleRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            titleRect.setAttribute('x', x);
            titleRect.setAttribute('y', y);
            titleRect.setAttribute('width', totalWidth);
            titleRect.setAttribute('height', titleHeight - 10);
            titleRect.setAttribute('fill', '#f8f9fa');
            titleRect.setAttribute('stroke', '#dee2e6');
            titleRect.setAttribute('stroke-width', '1');
            
            var titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            titleText.setAttribute('x', x + totalWidth/2);
            titleText.setAttribute('y', y + 30);
            titleText.setAttribute('text-anchor', 'middle');
            titleText.setAttribute('font-family', 'Arial, sans-serif');
            titleText.setAttribute('font-size', '18');
            titleText.setAttribute('font-weight', 'bold');
            titleText.setAttribute('fill', '#212529');
            titleText.textContent = phenotypeInfo.title;
            
            titleGroup.appendChild(titleRect);
            titleGroup.appendChild(titleText);
            
            // Add carrier status legend
            var legendGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            legendGroup.setAttribute('class', 'carrier-legend');
            
            // Legend background - positioned well clear of the tree
            var legendRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            legendRect.setAttribute('x', x + bbox.width + margin + legendMargin);
            legendRect.setAttribute('y', y + titleHeight + 10);
            legendRect.setAttribute('width', legendWidth - 10);
            legendRect.setAttribute('height', 140);
            legendRect.setAttribute('fill', '#f8f9fa');
            legendRect.setAttribute('stroke', '#ddd');
            legendRect.setAttribute('stroke-width', '1');
            legendRect.setAttribute('rx', '5');
            legendGroup.appendChild(legendRect);
            
            // Legend title
            var legendTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            legendTitle.setAttribute('x', x + bbox.width + margin + legendMargin + 10);
            legendTitle.setAttribute('y', y + titleHeight + 30);
            legendTitle.setAttribute('font-family', 'Arial, sans-serif');
            legendTitle.setAttribute('font-size', '14');
            legendTitle.setAttribute('font-weight', 'bold');
            legendTitle.setAttribute('fill', '#2c5aa0');
            legendTitle.textContent = 'Carrier Status';
            legendGroup.appendChild(legendTitle);
            
            // Legend items
            var legendItems = [
                { text: 'Not affected', type: 'normal' },
                { text: 'Carrier', type: 'carrier' },
                { text: 'Affected', type: 'affected' },
                { text: 'Pre-symptomatic', type: 'presymptomatic' }
            ];
            
            legendItems.forEach(function(item, index) {
                var yPos = y + titleHeight + 50 + (index * 25);
                var xPos = x + bbox.width + margin + legendMargin + 10;
                
                // Create icon based on carrier status type
                if (item.type === 'normal') {
                    // Empty circle with light gray fill
                    var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    circle.setAttribute('cx', xPos + 10);
                    circle.setAttribute('cy', yPos);
                    circle.setAttribute('r', '8');
                    circle.setAttribute('fill', '#DDDDDD');
                    circle.setAttribute('stroke', '#333');
                    circle.setAttribute('stroke-width', '2');
                    legendGroup.appendChild(circle);
                } else if (item.type === 'carrier') {
                    // Circle with dot
                    var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    circle.setAttribute('cx', xPos + 10);
                    circle.setAttribute('cy', yPos);
                    circle.setAttribute('r', '8');
                    circle.setAttribute('fill', '#DDDDDD');
                    circle.setAttribute('stroke', '#333');
                    circle.setAttribute('stroke-width', '2');
                    legendGroup.appendChild(circle);
                    
                    var dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    dot.setAttribute('cx', xPos + 10);
                    dot.setAttribute('cy', yPos);
                    dot.setAttribute('r', '4');
                    dot.setAttribute('fill', '#595959');
                    legendGroup.appendChild(dot);
                } else if (item.type === 'affected') {
                    // Filled circle with medical yellow color
                    var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    circle.setAttribute('cx', xPos + 10);
                    circle.setAttribute('cy', yPos);
                    circle.setAttribute('r', '8');
                    circle.setAttribute('fill', '#ddc27d');
                    circle.setAttribute('stroke', '#333');
                    circle.setAttribute('stroke-width', '2');
                    legendGroup.appendChild(circle);
                } else if (item.type === 'presymptomatic') {
                    // Circle with vertical line
                    var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    circle.setAttribute('cx', xPos + 10);
                    circle.setAttribute('cy', yPos);
                    circle.setAttribute('r', '8');
                    circle.setAttribute('fill', '#DDDDDD');
                    circle.setAttribute('stroke', '#333');
                    circle.setAttribute('stroke-width', '2');
                    legendGroup.appendChild(circle);
                    
                    var line = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    line.setAttribute('x', xPos + 7);
                    line.setAttribute('y', yPos - 6);
                    line.setAttribute('width', '6');
                    line.setAttribute('height', '12');
                    line.setAttribute('fill', '#777777');
                    legendGroup.appendChild(line);
                }
                
                // Add text
                var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', xPos + 25);
                text.setAttribute('y', yPos + 4);
                text.setAttribute('font-family', 'Arial, sans-serif');
                text.setAttribute('font-size', '12');
                text.setAttribute('fill', '#333');
                text.textContent = item.text;
                legendGroup.appendChild(text);
            });
            
            clonedSvg.insertBefore(legendGroup, clonedSvg.firstChild);
            titleGroup.appendChild(titleText);
            clonedSvg.insertBefore(titleGroup, clonedSvg.firstChild);
        }
        
        // Convert to string
        var serializer = new XMLSerializer();
        var svgString = serializer.serializeToString(clonedSvg);
        
        // Add XML declaration
        svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;
        
        // Save the file
        saveTextAs(svgString, fileName || 'pedigree.svg', 'image/svg+xml');
        
    } catch (error) {
        console.error('SVG export failed:', error);
        alert('Failed to export as SVG: ' + error.message);
    }
};

/**
 * Exports the pedigree as PNG using canvas conversion
 * @param {String} fileName - The name of the file to save
 */
VisualExport.exportAsPNG = function(fileName) {
    try {
        VisualExport._exportAsRasterImage(fileName || 'pedigree.png', 'image/png');
    } catch (error) {
        console.error('PNG export failed:', error);
        alert('Failed to export as PNG: ' + error.message);
    }
};

/**
 * Exports the pedigree as JPG using canvas conversion
 * @param {String} fileName - The name of the file to save
 */
VisualExport.exportAsJPG = function(fileName) {
    try {
        VisualExport._exportAsRasterImage(fileName || 'pedigree.jpg', 'image/jpeg');
    } catch (error) {
        console.error('JPG export failed:', error);
        alert('Failed to export as JPG: ' + error.message);
    }
};

/**
 * Exports the pedigree as PDF
 * @param {String} fileName - The name of the file to save
 */
VisualExport.exportAsPDF = function(fileName) {
    try {
        // Check if jsPDF is available
        if (typeof jsPDF === 'undefined') {
            alert('PDF export requires jsPDF library. The library has been included in this page - please refresh the page and try again.');
            return;
        }
        
        var phenotypeInfo = VisualExport.extractPhenotypeInfo();
        var paper = editor.getPaper();
        var bbox = VisualExport._calculateBounds();
        
        if (!bbox) {
            alert('Could not determine pedigree bounds for PDF export');
            return;
        }
        
        // Create PDF with appropriate size
        var margin = 40;
        var titleHeight = 60;
        var width = (bbox.width + margin * 2) * 0.75; // Convert to points (72 DPI)
        var height = (bbox.height + margin * 2 + titleHeight) * 0.75;
        
        // Determine orientation
        var orientation = width > height ? 'l' : 'p';
        var format = [width, height];
        
        var pdf = new jsPDF(orientation, 'pt', format);
        
        // Add title to PDF
        pdf.setFontSize(18);
        pdf.setFont('Arial', 'bold');
        var titleWidth = pdf.getTextWidth(phenotypeInfo.title);
        var titleX = (width - titleWidth) / 2;
        pdf.text(phenotypeInfo.title, titleX, 40);
        
        // Convert SVG to PDF
        VisualExport._convertSVGToPDF(paper.canvas, pdf, margin, titleHeight).then(function() {
            pdf.save(fileName || 'pedigree.pdf');
        }).catch(function(error) {
            console.error('PDF conversion failed:', error);
            alert('Failed to convert to PDF: ' + error.message);
        });
        
    } catch (error) {
        console.error('PDF export failed:', error);
        alert('Failed to export as PDF: ' + error.message);
    }
};

/**
 * Exports the pedigree as HTML page
 * @param {String} fileName - The name of the file to save
 */
VisualExport.exportAsHTML = function(fileName) {
    try {
        var paper = editor.getPaper();
        var svgElement = paper.canvas;
        var phenotypeInfo = VisualExport.extractPhenotypeInfo();

        // Clone and prepare SVG
        var clonedSvg = svgElement.cloneNode(true);
        clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

        // Calculate full bounds to capture complete tree
        var bbox = VisualExport._calculateBounds();
        if (bbox) {
            var margin = 20;  // Standard margin for complete tree capture
            var width = bbox.width + (margin * 2);
            var height = bbox.height + (margin * 2);
            var x = bbox.x - margin;
            var y = bbox.y - margin;

            clonedSvg.setAttribute('viewBox', x + ' ' + y + ' ' + width + ' ' + height);
            clonedSvg.style.width = '100%';
            clonedSvg.style.height = 'auto';
            clonedSvg.style.maxWidth = width + 'px';
        }

        // Generate phenotype summary
        var phenotypeSummary = '';
        if (Object.keys(phenotypeInfo.phenotypes).length > 0) {
            phenotypeSummary = '<div class="phenotype-summary"><h3>Phenotypes:</h3><ul>';
            for (var phenotype in phenotypeInfo.phenotypes) {
                var count = phenotypeInfo.phenotypes[phenotype];
                var caseText = count === 1 ? '1 case' : count + ' cases';
                phenotypeSummary += '<li><strong>' + phenotype + '</strong> (' + caseText + ')</li>';
            }
            phenotypeSummary += '</ul></div>';
        }

        // Create HTML document with simple header and legend
        var htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${phenotypeInfo.title} - Generated by Panogram</title>
    <style>
        body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            background-color: white;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #2c5aa0;
            padding-bottom: 10px;
        }
        .header h1 {
            margin: 0;
            color: #2c5aa0;
            font-size: 24px;
        }
        .content {
            display: flex;
            gap: 15px;  /* Reduced gap to bring legend closer */
        }
        .pedigree-container {
            flex: 1;
        }
        .pedigree-svg {
            display: block;
            width: 100%;
            height: auto;
            border: 1px solid #ddd;
        }
        .legend {
            width: 180px;  /* Reduced width to bring closer to tree */
            background: #f8f9fa;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
        }
        .legend h3 {
            margin: 0 0 15px 0;
            color: #2c5aa0;
            font-size: 16px;
        }
        .legend-item {
            display: flex;
            align-items: center;
            margin: 8px 0;
            font-size: 14px;
        }
        .legend-icon {
            width: 20px;
            height: 20px;
            margin-right: 10px;
            border: 2px solid #333;
            border-radius: 50%;
            display: inline-block;
            position: relative;
        }
        .not-affected {
            background-color: #DDDDDD;
        }
        .carrier {
            background-color: #DDDDDD;
            position: relative;
        }
        .carrier::after {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 8px;
            height: 8px;
            background-color: #595959;
            border-radius: 50%;
            transform: translate(-50%, -50%);
        }
        .affected {
            background-color: #ddc27d;  /* Medical yellow color */
        }
        .presymptomatic {
            background-color: #DDDDDD;
            border: 2px solid #333;
        }
        .presymptomatic::before {
            content: '';
            position: absolute;
            top: 2px;
            left: 50%;
            width: 6px;
            height: calc(100% - 4px);
            background-color: #777777;
            transform: translateX(-50%);
        }
        @media print {
            body { margin: 10px; }
            .content { flex-direction: column; }
            .legend { width: auto; margin-top: 20px; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${phenotypeInfo.title}</h1>
    </div>
    <div class="content">
        <div class="pedigree-container">
            ${new XMLSerializer().serializeToString(clonedSvg)}
        </div>
        <div class="legend">
            <h3>Carrier Status</h3>
            <div class="legend-item">
                <span class="legend-icon not-affected"></span>
                Not affected
            </div>
            <div class="legend-item">
                <span class="legend-icon carrier"></span>
                Carrier
            </div>
            <div class="legend-item">
                <span class="legend-icon affected"></span>
                Affected
            </div>
            <div class="legend-item">
                <span class="legend-icon presymptomatic"></span>
                Pre-symptomatic
            </div>
        </div>
    </div>
</body>
</html>`;

        // Save the HTML file
        saveTextAs(htmlContent, fileName || 'pedigree.html', 'text/html');

    } catch (error) {
        console.error('HTML export failed:', error);
        alert('Failed to export as HTML: ' + error.message);
    }
};

/**
 * Helper function to export as raster images (PNG/JPG)
 * @private
 */
VisualExport._exportAsRasterImage = function(fileName, mimeType) {
    var phenotypeInfo = VisualExport.extractPhenotypeInfo();
    
    // Try html2canvas first for better full-screen capture
    if (typeof html2canvas !== 'undefined') {
        try {
            // Create a temporary container with the pedigree and legend
            var tempContainer = document.createElement('div');
            tempContainer.style.position = 'absolute';
            tempContainer.style.left = '-9999px';
            tempContainer.style.top = '0';
            tempContainer.style.background = mimeType === 'image/jpeg' ? '#ffffff' : 'white';
            tempContainer.style.padding = '20px';
            tempContainer.style.fontFamily = 'Arial, sans-serif';
            tempContainer.style.display = 'flex';
            tempContainer.style.gap = '20px';  // Reduced gap to bring legend closer
            tempContainer.style.minWidth = '1100px';  // Reduced since legend is closer
            
            // Add header
            var headerDiv = document.createElement('div');
            headerDiv.style.position = 'absolute';
            headerDiv.style.top = '20px';
            headerDiv.style.left = '20px';
            headerDiv.style.right = '20px';
            headerDiv.style.textAlign = 'center';
            headerDiv.style.borderBottom = '2px solid #2c5aa0';
            headerDiv.style.paddingBottom = '10px';
            headerDiv.style.marginBottom = '20px';
            
            var titleElement = document.createElement('h1');
            titleElement.style.margin = '0';
            titleElement.style.color = '#2c5aa0';
            titleElement.style.fontSize = '24px';
            titleElement.textContent = phenotypeInfo.title;
            headerDiv.appendChild(titleElement);
            
            // Create content area with proper spacing
            var contentDiv = document.createElement('div');
            contentDiv.style.display = 'flex';
            contentDiv.style.gap = '20px';  // Reduced gap to bring legend closer to tree
            contentDiv.style.marginTop = '80px';
            
            // Clone and add the pedigree canvas
            var paper = editor.getPaper();
            var svgElement = paper.canvas;
            var clonedSvg = svgElement.cloneNode(true);
            
            // Calculate full bounds to capture complete tree without cutting anything
            var bbox = VisualExport._calculateBounds();
            if (bbox) {
                var margin = 20;  // Standard margin around complete tree
                var width = bbox.width + (margin * 2);
                var height = bbox.height + (margin * 2);
                var x = bbox.x - margin;
                var y = bbox.y - margin;
                
                clonedSvg.setAttribute('viewBox', x + ' ' + y + ' ' + width + ' ' + height);
                clonedSvg.setAttribute('width', width);
                clonedSvg.setAttribute('height', height);
                clonedSvg.style.border = '1px solid #ddd';
            }
            
            var pedigreeDiv = document.createElement('div');
            pedigreeDiv.style.flex = '1';
            pedigreeDiv.appendChild(clonedSvg);
            
            // Create legend with fixed width to prevent overlap
            var legendDiv = document.createElement('div');
            legendDiv.style.width = '200px';  // Slightly reduced width 
            legendDiv.style.minWidth = '200px';  // Ensure it doesn't shrink
            legendDiv.style.background = '#f8f9fa';
            legendDiv.style.padding = '15px';
            legendDiv.style.border = '1px solid #ddd';
            legendDiv.style.borderRadius = '5px';
            legendDiv.style.height = 'fit-content';
            legendDiv.style.flexShrink = '0';  // Prevent shrinking that could cause overlap
            
            var legendTitle = document.createElement('h3');
            legendTitle.style.margin = '0 0 15px 0';
            legendTitle.style.color = '#2c5aa0';
            legendTitle.style.fontSize = '16px';
            legendTitle.textContent = 'Carrier Status';
            legendDiv.appendChild(legendTitle);
            
            // Legend items with correct Panogram carrier status representations
            var legendItems = [
                { text: 'Not affected', className: 'not-affected' },
                { text: 'Carrier', className: 'carrier' },
                { text: 'Affected', className: 'affected' },
                { text: 'Pre-symptomatic', className: 'presymptomatic' }
            ];
            
            legendItems.forEach(function(item) {
                var itemDiv = document.createElement('div');
                itemDiv.style.display = 'flex';
                itemDiv.style.alignItems = 'center';
                itemDiv.style.margin = '8px 0';
                itemDiv.style.fontSize = '14px';
                
                var iconSpan = document.createElement('span');
                iconSpan.style.width = '20px';
                iconSpan.style.height = '20px';
                iconSpan.style.marginRight = '10px';
                iconSpan.style.border = '2px solid #333';
                iconSpan.style.borderRadius = '50%';
                iconSpan.style.display = 'inline-block';
                iconSpan.style.position = 'relative';
                
                switch(item.className) {
                    case 'not-affected':
                        iconSpan.style.backgroundColor = '#DDDDDD';
                        break;
                    case 'carrier':
                        iconSpan.style.backgroundColor = '#DDDDDD';
                        // Create carrier dot (like in Panogram)
                        var dot = document.createElement('div');
                        dot.style.position = 'absolute';
                        dot.style.top = '50%';
                        dot.style.left = '50%';
                        dot.style.width = '8px';
                        dot.style.height = '8px';
                        dot.style.backgroundColor = '#595959';
                        dot.style.borderRadius = '50%';
                        dot.style.transform = 'translate(-50%, -50%)';
                        iconSpan.appendChild(dot);
                        break;
                    case 'affected':
                        iconSpan.style.backgroundColor = '#ddc27d';  // Medical yellow color
                        iconSpan.style.borderColor = '#333';
                        break;
                    case 'presymptomatic':
                        iconSpan.style.backgroundColor = '#DDDDDD';
                        // Create presymptomatic vertical line (like in Panogram)
                        var line = document.createElement('div');
                        line.style.position = 'absolute';
                        line.style.top = '2px';
                        line.style.left = '50%';
                        line.style.width = '6px';
                        line.style.height = 'calc(100% - 4px)';
                        line.style.backgroundColor = '#777777';
                        line.style.transform = 'translateX(-50%)';
                        iconSpan.appendChild(line);
                        break;
                }
                
                var textSpan = document.createElement('span');
                textSpan.textContent = item.text;
                
                itemDiv.appendChild(iconSpan);
                itemDiv.appendChild(textSpan);
                legendDiv.appendChild(itemDiv);
            });
            
            contentDiv.appendChild(pedigreeDiv);
            contentDiv.appendChild(legendDiv);
            
            tempContainer.appendChild(headerDiv);
            tempContainer.appendChild(contentDiv);
            document.body.appendChild(tempContainer);
            
            html2canvas(tempContainer, {
                backgroundColor: mimeType === 'image/jpeg' ? '#ffffff' : 'white',
                scale: 2, // Higher quality
                useCORS: true,
                allowTaint: true,
                width: tempContainer.scrollWidth,
                height: tempContainer.scrollHeight
            }).then(function(canvas) {
                document.body.removeChild(tempContainer);
                
                canvas.toBlob(function(blob) {
                    if (blob) {
                        var url = URL.createObjectURL(blob);
                        var link = document.createElement('a');
                        link.href = url;
                        link.download = fileName;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                    } else {
                        alert('Failed to create image blob');
                    }
                }, mimeType, 0.95);
                
            }).catch(function(error) {
                document.body.removeChild(tempContainer);
                console.error('html2canvas failed:', error);
                VisualExport._fallbackCanvasMethod(fileName, mimeType);
            });
            
        } catch (error) {
            console.error('html2canvas setup failed:', error);
            VisualExport._fallbackCanvasMethod(fileName, mimeType);
        }
    } else {
        // Fallback to canvas method
        VisualExport._fallbackCanvasMethod(fileName, mimeType);
    }
};

/**
 * Fallback canvas method for raster export
 * @private
 */
VisualExport._fallbackCanvasMethod = function(fileName, mimeType) {
    var paper = editor.getPaper();
    var svgElement = paper.canvas;
    
    // Calculate bounds
    var bbox = VisualExport._calculateBounds();
    if (!bbox) {
        alert('Could not determine pedigree bounds for image export');
        return;
    }
    
    // Create a temporary canvas - just capture the pedigree without title
    var canvas = document.createElement('canvas');
    var margin = 20;
    var scale = 2; // For better quality
    
    canvas.width = (bbox.width + margin * 2) * scale;
    canvas.height = (bbox.height + margin * 2) * scale;
    
    var ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);
    
    // Set background color for JPG
    if (mimeType === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width / scale, canvas.height / scale);
    }
    
    // Convert SVG to canvas - no title, just the pedigree
    var svgString = new XMLSerializer().serializeToString(svgElement);
    var img = new Image();
    
    img.onload = function() {
        try {
            ctx.drawImage(img, margin - bbox.x, margin - bbox.y, bbox.width, bbox.height);
            
            // Convert canvas to blob and download
            canvas.toBlob(function(blob) {
                if (blob) {
                    var url = URL.createObjectURL(blob);
                    var link = document.createElement('a');
                    link.href = url;
                    link.download = fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                } else {
                    alert('Failed to create image blob');
                }
            }, mimeType, 0.95);
            
        } catch (error) {
            console.error('Canvas drawing failed:', error);
            alert('Image export failed. Please try SVG format instead.');
        }
    };
    
    img.onerror = function() {
        console.error('Failed to load SVG as image');
        alert('Image export failed. Please try SVG format instead.');
    };
    
    // Create data URL from SVG
    var svgBlob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
    var svgUrl = URL.createObjectURL(svgBlob);
    img.src = svgUrl;
};

/**
 * Fallback method using html2canvas if available
 * @private
 */
VisualExport._fallbackToHtml2Canvas = function(fileName, mimeType) {
    if (typeof html2canvas !== 'undefined') {
        var canvasElement = editor.getPaper().canvas.parentNode;
        html2canvas(canvasElement).then(function(canvas) {
            canvas.toBlob(function(blob) {
                if (blob) {
                    var url = URL.createObjectURL(blob);
                    var link = document.createElement('a');
                    link.href = url;
                    link.download = fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                } else {
                    alert('Failed to create image using html2canvas');
                }
            }, mimeType, 0.95);
        }).catch(function(error) {
            console.error('html2canvas failed:', error);
            alert('Image export failed. Please try SVG format instead.');
        });
    } else {
        alert('Raster image export requires additional libraries. SVG export is recommended.');
    }
};

/**
 * Calculate the full bounding box of all pedigree content to ensure nothing is cut off
 * @private
 */
VisualExport._calculateBounds = function() {
    try {
        var paper = editor.getPaper();
        
        // First try to get the full canvas bounds
        if (paper.canvas && paper.canvas.getBBox) {
            try {
                var canvasBBox = paper.canvas.getBBox();
                if (canvasBBox.width > 0 && canvasBBox.height > 0) {
                    return canvasBBox;
                }
            } catch (e) {
                // Continue to fallback method
            }
        }
        
        // Fallback: calculate from all elements to ensure complete capture
        var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        var hasElements = false;
        
        // Get all shapes from the paper to ensure we capture everything
        paper.forEach(function(el) {
            if (el.getBBox) {
                try {
                    var bbox = el.getBBox();
                    if (bbox.width > 0 && bbox.height > 0) {
                        minX = Math.min(minX, bbox.x);
                        minY = Math.min(minY, bbox.y);
                        maxX = Math.max(maxX, bbox.x + bbox.width);
                        maxY = Math.max(maxY, bbox.y + bbox.height);
                        hasElements = true;
                    }
                } catch (e) {
                    // Skip elements that can't provide bbox
                }
            }
        });
        
        if (hasElements) {
            return {
                x: minX,
                y: minY,
                width: maxX - minX,
                height: maxY - minY
            };
        }
        
        // Final fallback: use paper dimensions
        return {
            x: 0,
            y: 0,
            width: paper.width || 800,
            height: paper.height || 600
        };
        
    } catch (error) {
        console.error('Error calculating full bounds:', error);
        return { x: 0, y: 0, width: 800, height: 600 };
    }
};

/**
 * Convert SVG to PDF (enhanced implementation)
 * @private
 */
VisualExport._convertSVGToPDF = function(svgElement, pdf, margin, titleHeight) {
    return new Promise(function(resolve, reject) {
        try {
            var svgString = new XMLSerializer().serializeToString(svgElement);
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            var img = new Image();
            
            img.onload = function() {
                try {
                    var bbox = VisualExport._calculateBounds();
                    var scale = 2; // Higher quality
                    
                    canvas.width = (bbox.width + margin * 2) * scale;
                    canvas.height = (bbox.height + margin * 2) * scale;
                    ctx.scale(scale, scale);
                    
                    // Fill white background
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width / scale, canvas.height / scale);
                    
                    // Draw the SVG
                    ctx.drawImage(img, margin, margin + (titleHeight || 0));
                    
                    var imgData = canvas.toDataURL('image/png');
                    var imgWidth = (bbox.width + margin * 2) * 0.75;
                    var imgHeight = (bbox.height + margin * 2) * 0.75;
                    
                    pdf.addImage(imgData, 'PNG', 0, titleHeight || 0, imgWidth, imgHeight);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            
            img.onerror = function() {
                reject(new Error('Failed to load SVG for PDF conversion'));
            };
            
            var svgBlob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
            img.src = URL.createObjectURL(svgBlob);
            
        } catch (error) {
            reject(error);
        }
    });
};
