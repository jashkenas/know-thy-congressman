# Sleuth digs up the dirt on congressmen.

require 'rest_client'
require 'json'

class Sleuth
  
  WATCHDOG       = 'http://watchdog.net'
  SUNLIGHT       = 'http://services.sunlightlabs.com/api'
  OPENSECRETS    = 'http://www.opensecrets.org/api/?output=json'
  FLICKR         = 'http://api.flickr.com/services/rest?method=flickr.photos.search&format=json&nojsoncallback=1?sort=relevance?per_page=10?extras=owner_name'
  TIMES_TAGS     = 'http://api.nytimes.com/svc/timestags/suggest?filter=(Per)'
  TIMES_ARTICLES = 'api.nytimes.com'
  
  
  # Dig up all the dirt available about a congressman...
  def dig_up_dirt(first_name, last_name)
    @data = {}
    first_name.downcase! and last_name.downcase!
    sunlight_data, watchdog_data, flickr_data, contributor_data, industry_data, tags_data, articles_data = 
      {}, {}, {}, {}, {}, {}, {}
      
    sunlight = Thread.new { sunlight_data = search_sunlight_labs(first_name, last_name) }
    sunlight.join
    merge_data(sunlight_data)
    first_name, last_name = @data['firstname'], @data['lastname']
    
    watchdog = Thread.new { watchdog_data = search_watchdog(first_name, last_name) }
    flickr   = Thread.new { flickr_data   = search_flickr(first_name, last_name) }
    tags     = Thread.new { tags_data     = search_nytimes_tags(first_name, last_name) }
    
    watchdog.join and tags.join
    merge_data(watchdog_data, tags_data)
    os_id, person_facet = @data['opensecretsid'], @data['person_facet']
    
    contributor = Thread.new { contributor_data = search_opensecrets_contributors(os_id) }
    industry    = Thread.new { industry_data    = search_opensecrets_industries(os_id) }
    articles    = Thread.new { articles_data    = search_nytimes_articles(person_facet) }
    
    contributor.join and industry.join and articles.join and flickr.join
    merge_data(contributor_data, industry_data, articles_data, flickr_data)
  end
  
  
  # Dig up dirt from Sunlight Labs...
  def search_sunlight_labs(first_name, last_name)
    safe_request do
      url = "#{SUNLIGHT}/legislators.search.json?apikey=#{SECRETS['sunlight']}&name=#{first_name}%20#{last_name}"
      result = get_json(url)['response']['results'].sort_by {|r| r['result']['score'] }.last
      result['result']['legislator']
    end
  end
  
  
  # Dig up dirt about a given congressman at watchdog...
  def search_watchdog(first_name, last_name)
    safe_request do
      url = "#{WATCHDOG}/p/#{first_name.downcase}_#{last_name.downcase}.json"
      data = get_json(url).first
      data.delete 'bills_sponsored'     # Just a buncha URLS, not too useful.
      data.delete 'earmarks_sponsored'  # Always seems to return a list of nils.
      data
    end
  end
  
  
  # Dig up (embarrassing) photos of the politician on Flickr...
  def search_flickr(first_name, last_name)
    safe_request do
      url = "#{FLICKR}&api_key=#{SECRETS['flickr_key']}&text=%22#{first_name}%20#{last_name}%22"
      data = get_json(url)
      {'flickr' => data['photos']['photo']}
    end
  end
  
  
  # Dig up dirt from OpenSecrets.org about individual campaign contributors...
  def search_opensecrets_contributors(id)
    safe_request(:ensure => id) do
      url = "#{OPENSECRETS}&method=candContrib&cid=#{id}&apikey=#{SECRETS['opensecrets']}"
      info = get_json(url)['response']['contributors']['contributor']
      {'opensecrets_contributors' => info.map {|el| el['@attributes'] } }
    end
  end
  
  
  # Dig up dirt from OpenSecrets.org about industry campaign contributors...
  def search_opensecrets_industries(id)
    safe_request(:ensure => id) do
      url = "#{OPENSECRETS}&method=candIndustry&cid=#{id}&apikey=#{SECRETS['opensecrets']}"
      info = get_json(url)['response']['industries']['industry']
      {'opensecrets_industries' => info.map {|el| el['@attributes'] } }
    end
  end
  
  
  
  # Dig up the Person Facet from the Gray Lady...
  def search_nytimes_tags(first_name, last_name)
    safe_request do
      url = "#{TIMES_TAGS}&api-key=#{SECRETS['times_tags']}&query=#{first_name}%20#{last_name}"
      result = get_json(url)['results'].first
      facet = result ? result.sub(/\s*\(Per\)\Z/, '').upcase : nil
      {'person_facet' => facet}
    end
  end
  
  
  # Dig up a list of articles from the Gray Lady...
  #
  # Nota Bene: In order to use the NYTimes Articles API, you need to request 
  # urls that are invalid from the viewpoint of Ruby's URI class. We work around
  # URI.parse by using a raw Net::HTTP request instead of RestClient.
  def search_nytimes_articles(facet)
    safe_request(:ensure => facet) do
      url = "/svc/search/v1/article?api-key=#{SECRETS['times_articles']}&query=per_facet:[#{URI.encode(facet)}]&fields=title,url,body,date"
      response = Net::HTTP.get_response(TIMES_ARTICLES, url)
      results = JSON.parse(response.body)['results']
      {'nytimes_articles' => results}
    end
  end
  
  
  private
  
  # Use the JSON and RestClient gems to get json from a url
  def get_json(url)
    JSON.parse(RestClient.get(url))
  end
  
  
  # Merge data from disparate APIs into a single body of (soon-to-be) JSON:
  def merge_data(*results)
    results.each {|result| @data.merge!(result) }
    @data
  end
  
  
  # Ensure that a failed api call doesn't screw up the remainder of our data.
  def safe_request(opts={})
    return {} if opts.has_key?(:ensure) && !opts[:ensure]
    begin
      yield
    rescue RestClient::Exception => e
      {}
    end
  end
  
end