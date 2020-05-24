import pandas as pd
import matplotlib
import matplotlib.pyplot as plt

matplotlib.style.use('ggplot')
data = pd.read_csv('output.csv')

"""
agg_demand = data.agg_demand
time = data.time
agg_supply = data.agg_supply
plt.plot( time, agg_demand, color="r", label="agg_demand")
plt.plot( time, agg_supply, color="b", label="agg_supply")
"""

plt.legend()
data.set_index('time')[['agg_demand','agg_supply']].plot()
plt.show()