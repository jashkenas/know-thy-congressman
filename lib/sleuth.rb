# Sleuth digs up the dirt on congressmen.

require 'rest_client'
require 'json'

class Sleuth
  
  WATCHDOG = 'http://watchdog.net'
  SUNLIGHT = 'http://services.sunlightlabs.com/api'
  
  
  # Dig up all the dirt available about a congressman...
  def dig_up_dirt(first_name, last_name)
    first_name.downcase! and last_name.downcase!
    sunlight_data, watchdog_data = nil, nil
    
    sunlight = Thread.new { sunlight_data = search_sunlight_labs(first_name, last_name) }
    watchdog = Thread.new { watchdog_data = search_watchdog(first_name, last_name) }
    sunlight.join and watchdog.join
    
    sunlight_data.merge(watchdog_data)
  end
  
  
  # Dig up dirt from Sunlight Labs...
  def search_sunlight_labs(first_name, last_name)
    safe_request do
      url = "#{SUNLIGHT}/legislators.get.json?apikey=#{SECRETS['sunlight']}&firstname=#{first_name}&lastname=#{last_name}"
      json = RestClient.get url
      JSON.parse(json)['response']['legislator']
    end
  end
  
  
  # Dig up dirt about a given congressman at watchdog...
  def search_watchdog(first_name, last_name)
    safe_request do
      url = "#{WATCHDOG}/p/#{first_name.downcase}_#{last_name.downcase}.json"
      json = RestClient.get url
      data = JSON.parse(json).first
      data.delete 'bills_sponsored'     # Just a buncha URLS, not too useful.
      data.delete 'earmarks_sponsored'  # Always seems to return a list of nils.
      data
    end
  end
  
  
  private
  
  def safe_request
    begin
      yield
    rescue RestClient::Exception => e
      {}
    end
  end
  
  
end