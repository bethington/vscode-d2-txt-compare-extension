'use strict'
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k
        var desc = Object.getOwnPropertyDescriptor(m, k)
        if (
          !desc ||
          ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k]
            }
          }
        }
        Object.defineProperty(o, k2, desc)
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k
        o[k2] = m[k]
      })
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v })
      }
    : function (o, v) {
        o['default'] = v
      })
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = []
          for (var k in o)
            if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k
          return ar
        }
      return ownKeys(o)
    }
    return function (mod) {
      if (mod && mod.__esModule) return mod
      var result = {}
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++)
          if (k[i] !== 'default') __createBinding(result, mod, k[i])
      __setModuleDefault(result, mod)
      return result
    }
  })()
Object.defineProperty(exports, '__esModule', { value: true })
exports.D2DataVisualizationProvider = void 0
const vscode = __importStar(require('vscode'))
const fs = __importStar(require('fs'))
const path = __importStar(require('path'))
class D2DataVisualizationProvider {
  outputChannel
  webviewPanel
  constructor () {
    this.outputChannel = vscode.window.createOutputChannel(
      'D2 Data Visualization'
    )
  }
  async visualizeFile (filePath) {
    try {
      const data = await this.parseD2File(filePath)
      const fileName = path.basename(filePath, '.txt')
      // Generate appropriate visualizations based on file type
      const visualizations = this.generateVisualizationsForFile(fileName, data)
      await this.showVisualizationWebview(fileName, visualizations)
    } catch (error) {
      this.outputChannel.appendLine(
        `❌ Failed to visualize ${filePath}: ${error}`
      )
      vscode.window.showErrorMessage(`Failed to visualize file: ${error}`)
    }
  }
  async compareFiles (filePaths) {
    try {
      const datasets = []
      for (const filePath of filePaths) {
        const data = await this.parseD2File(filePath)
        const fileName = path.basename(filePath, '.txt')
        datasets.push({ name: fileName, data })
      }
      const comparisons = this.generateComparisons(datasets)
      await this.showComparisonWebview(
        datasets.map(d => d.name).join(' vs '),
        comparisons
      )
    } catch (error) {
      this.outputChannel.appendLine(`❌ Failed to compare files: ${error}`)
      vscode.window.showErrorMessage(`Failed to compare files: ${error}`)
    }
  }
  async parseD2File (filePath) {
    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\\n').filter(line => line.trim())
    if (lines.length < 2) {
      throw new Error('File must have at least a header and one data row')
    }
    const headers = lines[0].split('\\t')
    const data = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split('\\t')
      const row = {}
      headers.forEach((header, index) => {
        let value = values[index] || ''
        // Try to parse as number
        if (value && !isNaN(Number(value))) {
          value = Number(value)
        }
        row[header] = value
      })
      data.push(row)
    }
    return data
  }
  generateVisualizationsForFile (fileName, data) {
    const visualizations = []
    switch (fileName.toLowerCase()) {
      case 'armor':
        visualizations.push(...this.generateArmorVisualizations(data))
        break
      case 'weapons':
        visualizations.push(...this.generateWeaponVisualizations(data))
        break
      case 'skills':
        visualizations.push(...this.generateSkillVisualizations(data))
        break
      case 'monsters':
        visualizations.push(...this.generateMonsterVisualizations(data))
        break
      default:
        visualizations.push(...this.generateGenericVisualizations(data))
    }
    return visualizations
  }
  generateArmorVisualizations (data) {
    return [
      {
        title: 'Armor Class Distribution',
        type: 'histogram',
        data: data.map(item => ({
          name: item.name,
          minac: item.minac || 0,
          maxac: item.maxac || 0,
          avgac: ((item.minac || 0) + (item.maxac || 0)) / 2
        })),
        config: {
          xAxis: 'avgac',
          aggregation: 'count'
        }
      },
      {
        title: 'Durability vs AC Rating',
        type: 'scatter',
        data: data.map(item => ({
          name: item.name,
          durability: item.durability || 0,
          avgac: ((item.minac || 0) + (item.maxac || 0)) / 2,
          type: item.type || 'unknown'
        })),
        config: {
          xAxis: 'durability',
          yAxis: 'avgac',
          colorBy: 'type'
        }
      },
      {
        title: 'Requirements by Level',
        type: 'chart',
        data: data.map(item => ({
          name: item.name,
          levelreq: item.levelreq || 1,
          strreq: item.strreq || 0,
          dexreq: item.dexreq || 0,
          totalreq: (item.strreq || 0) + (item.dexreq || 0)
        })),
        config: {
          xAxis: 'levelreq',
          yAxis: 'totalreq'
        }
      }
    ]
  }
  generateWeaponVisualizations (data) {
    return [
      {
        title: 'Damage Distribution',
        type: 'histogram',
        data: data.map(item => ({
          name: item.name,
          mindam: item.mindam || 0,
          maxdam: item.maxdam || 0,
          avgdam: ((item.mindam || 0) + (item.maxdam || 0)) / 2
        })),
        config: {
          xAxis: 'avgdam',
          aggregation: 'count'
        }
      },
      {
        title: 'Speed vs Damage',
        type: 'scatter',
        data: data.map(item => ({
          name: item.name,
          speed: item.speed || 0,
          avgdam: ((item.mindam || 0) + (item.maxdam || 0)) / 2,
          type: item.type || 'unknown'
        })),
        config: {
          xAxis: 'speed',
          yAxis: 'avgdam',
          colorBy: 'type'
        }
      },
      {
        title: 'Weapon Types Overview',
        type: 'table',
        data: this.aggregateByType(data, 'type', ['mindam', 'maxdam', 'speed']),
        config: {}
      }
    ]
  }
  generateSkillVisualizations (data) {
    return [
      {
        title: 'Skills by Character Class',
        type: 'chart',
        data: this.aggregateByField(data, 'charclass'),
        config: {
          xAxis: 'charclass',
          yAxis: 'count'
        }
      },
      {
        title: 'Mana Cost Distribution',
        type: 'histogram',
        data: data
          .filter(skill => skill.mana > 0)
          .map(skill => ({
            name: skill.skill,
            mana: skill.mana || 0,
            charclass: skill.charclass
          })),
        config: {
          xAxis: 'mana',
          aggregation: 'count'
        }
      }
    ]
  }
  generateMonsterVisualizations (data) {
    return [
      {
        title: 'Monster Level Distribution',
        type: 'histogram',
        data: data.map(monster => ({
          name: monster.name || monster.Id,
          level: monster.Level || monster.level || 1
        })),
        config: {
          xAxis: 'level',
          aggregation: 'count'
        }
      },
      {
        title: 'Health vs Level',
        type: 'scatter',
        data: data.map(monster => ({
          name: monster.name || monster.Id,
          level: monster.Level || monster.level || 1,
          health: monster.minHP || monster.health || 0
        })),
        config: {
          xAxis: 'level',
          yAxis: 'health'
        }
      }
    ]
  }
  generateGenericVisualizations (data) {
    const numericFields = this.getNumericFields(data)
    const visualizations = []
    if (numericFields.length > 0) {
      // Create a distribution for the first numeric field
      visualizations.push({
        title: `${numericFields[0]} Distribution`,
        type: 'histogram',
        data: data.map(item => ({ value: item[numericFields[0]] || 0 })),
        config: {
          xAxis: 'value',
          aggregation: 'count'
        }
      })
    }
    if (numericFields.length >= 2) {
      // Create a scatter plot for two numeric fields
      visualizations.push({
        title: `${numericFields[0]} vs ${numericFields[1]}`,
        type: 'scatter',
        data: data.map(item => ({
          x: item[numericFields[0]] || 0,
          y: item[numericFields[1]] || 0
        })),
        config: {
          xAxis: 'x',
          yAxis: 'y'
        }
      })
    }
    return visualizations
  }
  generateComparisons (datasets) {
    const comparisons = []
    if (datasets.length === 2) {
      const [dataset1, dataset2] = datasets
      // Compare data counts
      comparisons.push({
        title: 'Data Count Comparison',
        type: 'chart',
        data: [
          { name: dataset1.name, count: dataset1.data.length },
          { name: dataset2.name, count: dataset2.data.length }
        ],
        config: {
          xAxis: 'name',
          yAxis: 'count'
        }
      })
      // Compare numeric fields if they exist
      const numericFields1 = this.getNumericFields(dataset1.data)
      const numericFields2 = this.getNumericFields(dataset2.data)
      const commonFields = numericFields1.filter(field =>
        numericFields2.includes(field)
      )
      for (const field of commonFields.slice(0, 3)) {
        // Limit to first 3 fields
        const avg1 = this.calculateAverage(dataset1.data, field)
        const avg2 = this.calculateAverage(dataset2.data, field)
        comparisons.push({
          title: `Average ${field} Comparison`,
          type: 'chart',
          data: [
            { name: dataset1.name, value: avg1 },
            { name: dataset2.name, value: avg2 }
          ],
          config: {
            xAxis: 'name',
            yAxis: 'value'
          }
        })
      }
    }
    return comparisons
  }
  getNumericFields (data) {
    if (data.length === 0) {
      return []
    }
    const sample = data[0]
    return Object.keys(sample).filter(key => typeof sample[key] === 'number')
  }
  calculateAverage (data, field) {
    const values = data
      .map(item => item[field] || 0)
      .filter(val => typeof val === 'number')
    return values.length > 0
      ? values.reduce((sum, val) => sum + val, 0) / values.length
      : 0
  }
  aggregateByField (data, field) {
    const counts = {}
    data.forEach(item => {
      const value = item[field] || 'unknown'
      counts[value] = (counts[value] || 0) + 1
    })
    return Object.entries(counts).map(([key, count]) => ({
      [field]: key,
      count
    }))
  }
  aggregateByType (data, typeField, numericFields) {
    const groups = {}
    data.forEach(item => {
      const type = item[typeField] || 'unknown'
      if (!groups[type]) {
        groups[type] = []
      }
      groups[type].push(item)
    })
    return Object.entries(groups).map(([type, items]) => {
      const result = { type, count: items.length }
      numericFields.forEach(field => {
        const values = items
          .map(item => item[field] || 0)
          .filter(val => typeof val === 'number')
        if (values.length > 0) {
          result[`avg_${field}`] =
            values.reduce((sum, val) => sum + val, 0) / values.length
          result[`min_${field}`] = Math.min(...values)
          result[`max_${field}`] = Math.max(...values)
        }
      })
      return result
    })
  }
  async showVisualizationWebview (title, visualizations) {
    if (this.webviewPanel) {
      this.webviewPanel.dispose()
    }
    this.webviewPanel = vscode.window.createWebviewPanel(
      'd2DataVisualization',
      `D2 Data: ${title}`,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    )
    this.webviewPanel.webview.html = this.generateVisualizationHTML(
      title,
      visualizations
    )
  }
  async showComparisonWebview (title, comparisons) {
    if (this.webviewPanel) {
      this.webviewPanel.dispose()
    }
    this.webviewPanel = vscode.window.createWebviewPanel(
      'd2DataComparison',
      `D2 Comparison: ${title}`,
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    )
    this.webviewPanel.webview.html = this.generateVisualizationHTML(
      title,
      comparisons
    )
  }
  generateVisualizationHTML (title, visualizations) {
    const chartsData = JSON.stringify(visualizations)
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 20px;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        .chart-container {
            margin: 20px 0;
            padding: 20px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            background: var(--vscode-panel-background);
        }
        .chart-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            color: var(--vscode-editor-foreground);
        }
        canvas {
            max-height: 400px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        th, td {
            padding: 8px 12px;
            text-align: left;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        th {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            font-weight: bold;
        }
        .summary {
            background: var(--vscode-textCodeBlock-background);
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <h1>📊 ${title}</h1>
    
    <div class="summary">
        <strong>Analysis Summary:</strong> Generated ${visualizations.length} visualization(s) 
        from D2 game data. Use these insights to understand balance, patterns, and relationships 
        in your mod data.
    </div>
    
    <div id="visualizations"></div>

    <script>
        const visualizations = ${chartsData};
        const container = document.getElementById('visualizations');

        visualizations.forEach((viz, index) => {
            const chartDiv = document.createElement('div');
            chartDiv.className = 'chart-container';
            
            const title = document.createElement('div');
            title.className = 'chart-title';
            title.textContent = viz.title;
            chartDiv.appendChild(title);

            if (viz.type === 'table') {
                const table = createTable(viz.data);
                chartDiv.appendChild(table);
            } else {
                const canvas = document.createElement('canvas');
                canvas.id = 'chart-' + index;
                chartDiv.appendChild(canvas);
                
                setTimeout(() => {
                    createChart(canvas.id, viz);
                }, 100);
            }
            
            container.appendChild(chartDiv);
        });

        function createTable(data) {
            const table = document.createElement('table');
            
            if (data.length === 0) {
                table.innerHTML = '<tr><td>No data available</td></tr>';
                return table;
            }
            
            // Create header
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            // Only add columns that are not line numbers (case-insensitive, trimmed)
            Object.keys(data[0]).forEach(key => {
                const normalized = key.trim().toLowerCase();
                if (!['line', 'row', 'index', 'number'].includes(normalized)) {
                    const th = document.createElement('th');
                    th.textContent = key;
                    headerRow.appendChild(th);
                }
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);
            // Create body
            const tbody = document.createElement('tbody');
            data.forEach(row => {
                const tr = document.createElement('tr');
                Object.entries(row).forEach(([key, value]) => {
                    const normalized = key.trim().toLowerCase();
                    if (!['line', 'row', 'index', 'number'].includes(normalized)) {
                        const td = document.createElement('td');
                        td.textContent = typeof value === 'number' ? value.toFixed(2) : value;
                        tr.appendChild(td);
                    }
                });
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            return table;
        }

        function createChart(canvasId, viz) {
            const ctx = document.getElementById(canvasId).getContext('2d');
            
            let chartConfig = {
                type: viz.type === 'histogram' ? 'bar' : 
                      viz.type === 'scatter' ? 'scatter' : 'line',
                data: prepareChartData(viz),
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            labels: {
                                color: 'var(--vscode-editor-foreground)'
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: { color: 'var(--vscode-editor-foreground)' },
                            grid: { color: 'var(--vscode-panel-border)' }
                        },
                        y: {
                            ticks: { color: 'var(--vscode-editor-foreground)' },
                            grid: { color: 'var(--vscode-panel-border)' }
                        }
                    }
                }
            };
            
            new Chart(ctx, chartConfig);
        }

        function prepareChartData(viz) {
            const data = viz.data;
            const config = viz.config;
            
            if (viz.type === 'histogram') {
                const buckets = createHistogramBuckets(data, config.xAxis);
                return {
                    labels: buckets.map(b => b.label),
                    datasets: [{
                        label: 'Count',
                        data: buckets.map(b => b.count),
                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                };
            } else if (viz.type === 'scatter') {
                return {
                    datasets: [{
                        label: 'Data Points',
                        data: data.map(item => ({
                            x: item[config.xAxis],
                            y: item[config.yAxis]
                        })),
                        backgroundColor: 'rgba(255, 99, 132, 0.6)',
                        borderColor: 'rgba(255, 99, 132, 1)'
                    }]
                };
            } else {
                return {
                    labels: data.map(item => item[config.xAxis] || item.name || 'Unknown'),
                    datasets: [{
                        label: config.yAxis || 'Value',
                        data: data.map(item => item[config.yAxis] || item.value || 0),
                        backgroundColor: 'rgba(75, 192, 192, 0.5)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 2,
                        fill: false
                    }]
                };
            }
        }

        function createHistogramBuckets(data, field) {
            const values = data.map(item => item[field] || 0).filter(v => typeof v === 'number');
            if (values.length === 0) return [];
            
            const min = Math.min(...values);
            const max = Math.max(...values);
            const bucketCount = Math.min(10, Math.ceil(Math.sqrt(values.length)));
            const bucketSize = (max - min) / bucketCount;
            
            const buckets = [];
            for (let i = 0; i < bucketCount; i++) {
                const start = min + i * bucketSize;
                const end = start + bucketSize;
                const count = values.filter(v => v >= start && (i === bucketCount - 1 ? v <= end : v < end)).length;
                
                buckets.push({
                    label: start.toFixed(1) + '-' + end.toFixed(1),
                    count: count
                });
            }
            
            return buckets;
        }
    </script>
</body>
</html>`
  }
}
exports.D2DataVisualizationProvider = D2DataVisualizationProvider
//# sourceMappingURL=dataVisualizationProvider.js.map
