# Sleuth digs up the dirt on congressmen.

require 'rest_client'
require 'json'

class Sleuth
  
  WATCHDOG    = 'http://watchdog.net'
  SUNLIGHT    = 'http://services.sunlightlabs.com/api'
  NYTIMES     = 'http://api.nytimes.com/svc/politics/v2/us/legislative/congress'
  OPENSECRETS = 'http://www.opensecrets.org/api/?output=json'
  FLICKR      = 'http://api.flickr.com/services/rest?method=flickr.photos.search&format=json&nojsoncallback=1?sort=relevance?extras=owner_name'
  
  
  # Dig up all the dirt available about a congressman...
  def dig_up_dirt(first_name, last_name)
    first_name.downcase! and last_name.downcase!
    sunlight_data, watchdog_data, flickr_data, contributor_data, industry_data = 
      nil, nil, nil, nil, nil
    
    sunlight = Thread.new { sunlight_data = search_sunlight_labs(first_name, last_name) }
    watchdog = Thread.new { watchdog_data = search_watchdog(first_name, last_name) }
    flickr   = Thread.new { flickr_data   = search_flickr(first_name, last_name) }
    
    sunlight.join and watchdog.join and flickr.join
    data = sunlight_data.merge(watchdog_data).merge(flickr_data)
    
    return data unless os_id = data['opensecretsid']
    contributor = Thread.new { contributor_data = search_opensecrets_contributors(os_id) }
    industry = Thread.new { industry_data = search_opensecrets_industries(os_id)}
    contributor.join and industry.join
    
    data.merge(contributor_data).merge(industry_data)
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
  
  
  # Dig up (embarrassing) photos of the politician on Flickr...
  def search_flickr(first_name, last_name)
    safe_request do
      url = "#{FLICKR}&api_key=#{SECRETS['flickr_key']}&text=%22#{first_name}%20#{last_name}%22"
      data = JSON.parse(RestClient.get(url))
      {'flickr' => data['photos']['photo']}
    end
  end
  
  
  # Dig up dirt from OpenSecrets.org about individual campaign contributors...
  def search_opensecrets_contributors(id)
    safe_request do
      data = {}
      url = "#{OPENSECRETS}&method=candContrib&cid=#{id}&apikey=#{SECRETS['opensecrets']}"
      info = JSON.parse(RestClient.get(url))['response']['contributors']['contributor']
      data['opensecrets_contributors'] = info.map {|el| el['@attributes'] }
      data
    end
  end
  
  
  # Dig up dirt from OpenSecrets.org about industry campaign contributors...
  def search_opensecrets_industries(id)
    safe_request do
      data = {}
      url = "#{OPENSECRETS}&method=candIndustry&cid=#{id}&apikey=#{SECRETS['opensecrets']}"
      info = JSON.parse(RestClient.get(url))['response']['industries']['industry']
      data['opensecrets_industries'] = info.map {|el| el['@attributes'] }
      data
    end
  end
  
  
  
  # Dig up dirt from the Gray Lady...
  def search_nytimes(first_name, last_name)
    # NYTimes API doesn't seem to return much useful congressional data,
    # nor does it allow you to search by name.
    # Maybe implement this later.
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