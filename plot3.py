import pandas as pd
import matplotlib
import matplotlib.pyplot as plt

matplotlib.style.use('ggplot')
data = pd.read_csv('output.csv')


plt.legend()
data.set_index('time')[['historical_prices']].plot()
plt.show()
