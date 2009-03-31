# Here's a little data store to cache the computed averages of some
# fields that we're interested in graphing.
class Statistic < ActiveRecord::Base
  
  validates_presence_of :json
  
  # A list of the points we'd like to average.
  DATA_POINTS = %w(
    amt_earmark_requested amt_earmark_received n_bills_cosponsored 
    n_bills_introduced n_bills_debated n_bills_enacted 
  )
  
  # Calculate the averages of the fields that we're interested in.
  def self.calculate_averages
    memo = DATA_POINTS.inject({}) do |hash, point| 
      hash[point] = {:sum => 0, :count => 0}
      hash
    end
    
    Politician.all.each do |pol|
      info = JSON.parse(pol.json)
      DATA_POINTS.each do |point|
        if info[point]
          memo[point][:sum]   += info[point]
          memo[point][:count] += 1
        end
      end
    end
    
    result = memo.inject({}) {|h, d| h[d[0]] = d[1][:sum] / d[1][:count].to_f; h }
    puts result.inspect
    Statistic.create! :json => result.to_json
  end
  
end
