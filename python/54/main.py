import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# Load data from the Excel file
file_path = "anexo.xlsx"
df = pd.read_excel(file_path)

# Display basic information about the dataframe
print(df.info())

# Display the first few rows of the dataframe
print(df.head())

# Create indicators for product return analysis
# For example, you can calculate the return rate and visualize it
df['RETURN_RATE'] = df['VLR_DEVOLUCAO'] / df['VLRFAT']

# Create a pivot table to analyze returns by product and month
pivot_table = pd.pivot_table(df, values='VLR_DEVOLUCAO', index='PRODUTO', columns='MES_ANO', aggfunc='sum', fill_value=0)

# Visualize the pivot table
plt.figure(figsize=(12, 8))
sns.heatmap(pivot_table, cmap='Blues', annot=True, fmt=".2f", cbar_kws={'label': 'Total Returns'})
plt.title('Product Returns Analysis by Month')
plt.show()
