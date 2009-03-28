require 'rest_client'
require 'json'

# Preload all the services because autoloading isn't reliable enough with threads.
%w(base capitol_words flickr new_york_times open_secrets sunlight watchdog).each do |service|
  require "#{RAILS_ROOT}/lib/services/#{service}"
end

# Services is like a sleuth that digs up the dirt on congressmen.
# Let's try to keep it all as stateless as possible, so that the threads don't
# step on each others toes.
module Services
  
  # If we can't find a resource for a particular congressman, then:
  class NotFoundException < RuntimeError; end
  
  
  # Dig up all the dirt available about a congressman...
  def self.dig_up_dirt(first_name, last_name)
    data = {'search_first_name' => first_name, 'search_last_name' => last_name}
    sunlight_data, watchdog_data, flickr_data, contributor_data, industry_data, tags_data, articles_data, words_data = 
      {}, {}, {}, {}, {}, {}, {}, {}
      
    sunlight = Thread.new { sunlight_data = Sunlight.search(first_name, last_name) }
    sunlight.join
    merge_data(data, sunlight_data)
    raise NotFoundException, "Can't find a legislator by that name..." if sunlight_data.empty?
    first_name, last_name = extract_name_from_congresspedia(data)
    bioguide_id = data['bioguide_id']
            
    watchdog = Thread.new { watchdog_data = Watchdog.search(bioguide_id) }
    flickr   = Thread.new { flickr_data   = Flickr.search(first_name, last_name) }
    tags     = Thread.new { tags_data     = NewYorkTimes.search_tags(data['search_first_name'], first_name, last_name) }
    words    = Thread.new { words_data    = CapitolWords.search(bioguide_id) }
    
    watchdog.join and tags.join
    merge_data(data, watchdog_data, tags_data)
    os_id, person_facet = data['opensecretsid'], data['person_facet']
    
    contributor = Thread.new { contributor_data = OpenSecrets.search_contributors(os_id) }
    industry    = Thread.new { industry_data    = OpenSecrets.search_industries(os_id) }
    articles    = Thread.new { articles_data    = NewYorkTimes.search_articles(person_facet) }
    
    contributor.join and industry.join and articles.join and flickr.join and words.join
    merge_data(data, contributor_data, industry_data, articles_data, flickr_data, words_data)
    data
  end
  
  
  private
  
  # Merge data from disparate APIs into a single body of (soon-to-be) JSON:
  def self.merge_data(data, *results)
    results.each {|result| data.merge!(result) }
  end
  
  
  # We really need to try to get a valid first name and last name. The sunlight
  # labs API takes care of searching for a congressperson, but sometimes returns
  # names with extra junk (like initials). Use the congresspedia url instead.
  def self.extract_name_from_congresspedia(data)
    url = data['congresspedia_url']
    unless url.blank?
      name  = url.match(/\/wiki\/(.+)\Z/)[1].split('_')
      # Filter out mistaken middle names
      data['firstname'] = name[0].gsub(/\s\w+$/, '')
      data['lastname']  = name[-1]
    end
    return data['firstname'], data['lastname']
  end
  
end