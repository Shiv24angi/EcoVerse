import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import random

def generate_synthetic_waste_data(num_samples=500):
    """
    Generates a synthetic dataset for baseline Exploratory Data Analysis.
    In the future, this can be swapped with a real CSV dataset (e.g., TrashNet).
    """
    print("🔄 Generating synthetic waste classification dataset...")
    categories = ['Recyclable', 'Organic', 'Hazardous', 'E-Waste']
    materials = ['Plastic', 'Paper', 'Glass', 'Metal', 'Food Scraps', 'Batteries', 'Electronics']
    
    data = []
    for _ in range(num_samples):
        category = random.choices(categories, weights=[0.4, 0.35, 0.1, 0.15])[0]
        
        # Assign logical materials based on category
        if category == 'Recyclable':
            mat = random.choice(['Plastic', 'Paper', 'Glass', 'Metal'])
        elif category == 'Organic':
            mat = 'Food Scraps'
        elif category == 'Hazardous':
            mat = 'Batteries'
        else:
            mat = 'Electronics'
            
        weight_grams = round(random.uniform(50.0, 2500.0), 2)
        data.append({'Category': category, 'Material': mat, 'Weight_g': weight_grams})
        
    return pd.DataFrame(data)

def run_eda():
    print("📊 Starting Exploratory Data Analysis (EDA)...\n")
    
    # 1. Load Data
    df = generate_synthetic_waste_data(1000)
    
    # 2. Basic Analytics
    print("-" * 40)
    print("Dataset Overview:")
    print("-" * 40)
    print(df.info())
    print("\nCategory Distribution:")
    print(df['Category'].value_counts())
    
    # 3. Data Visualization
    print("\n📈 Generating visualizations...")
    sns.set_theme(style="whitegrid")
    
    # Create a figure with 2 subplots (Fix: replaced unused 'fig' with '_')
    _, axes = plt.subplots(1, 2, figsize=(14, 6))
    
    # Plot 1: Count of Categories
    sns.countplot(data=df, x='Category', palette='viridis', ax=axes[0])
    axes[0].set_title('Distribution of Waste Categories')
    axes[0].set_ylabel('Number of Items')
    
    # Plot 2: Average Weight per Category
    sns.barplot(data=df, x='Category', y='Weight_g', palette='magma', errorbar=None, ax=axes[1])
    axes[1].set_title('Average Weight per Category (Grams)')
    axes[1].set_ylabel('Average Weight (g)')
    
    plt.tight_layout()
    
    # Save the plot with error handling (Fix: added try/except block)
    output_file = 'waste_distribution_analysis.png'
    try:
        plt.savefig(output_file, dpi=300)
        print(f"✅ EDA complete! Visualization saved as '{output_file}' in the current directory.")
    except (OSError, PermissionError) as e:
        print(f"❌ Error: Failed to save visualization: {e}")
        raise

if __name__ == "__main__":
    run_eda()