/**
 * DistributionSummary Component
 * Displays the total distribution amount
 */

export class DistributionSummary {
  constructor() {
    this.totalDistribution = 0;
    this.container = null;
  }

  /**
   * Render the distribution summary
   * @param {string} containerId - ID of the container element
   * @param {number} totalDistribution - Total distribution amount
   */
  render(containerId, totalDistribution = 0) {
    this.totalDistribution = totalDistribution;
    
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container with ID "${containerId}" not found`);
      return;
    }
    
    this.container = container;
    container.innerHTML = '';
    
    // Create summary container
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'distribution-summary';
    summaryDiv.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
    
    // Total distribution amount
    const totalDiv = document.createElement('div');
    totalDiv.className = 'summary-row total-row';
    totalDiv.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';
    
    const totalLabel = document.createElement('span');
    totalLabel.className = 'summary-label';
    totalLabel.textContent = 'Total Distribution:';
    totalLabel.style.cssText = 'color: white; font-size: 1.3rem; font-weight: 600;';
    
    const totalValue = document.createElement('span');
    totalValue.className = 'summary-value total-value';
    totalValue.id = 'total-distribution-value';
    totalValue.textContent = `£${this.totalDistribution.toFixed(2)}`;
    totalValue.style.cssText = 'color: white; font-size: 1.8rem; font-weight: 700;';
    
    totalDiv.appendChild(totalLabel);
    totalDiv.appendChild(totalValue);
    summaryDiv.appendChild(totalDiv);
    
    container.appendChild(summaryDiv);
  }

  /**
   * Update totals when amounts change
   * @param {number} totalDistribution - New total distribution amount
   */
  updateTotals(totalDistribution) {
    this.totalDistribution = totalDistribution;
    
    // Update the display immediately
    if (this.container) {
      const totalValueElement = document.getElementById('total-distribution-value');
      if (totalValueElement) {
        totalValueElement.textContent = `£${this.totalDistribution.toFixed(2)}`;
      }
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.totalDistribution = 0;
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
