module Services

  module OpenSecrets
    extend Base

    URL = 'www.opensecrets.org/api/?output=json'

    # Dig up dirt from OpenSecrets.org about individual campaign contributors...
    def self.search_contributors(bioguide_id)
      safe_request('opensecrets contributors', :ensure => bioguide_id) do
        url = "#{URL}&method=candContrib&cid=#{bioguide_id}&apikey=#{SECRETS['opensecrets']}"
        info = get_json(url)['response']['contributors']['contributor']
        {'opensecrets_contributors' => info.map {|el| el['@attributes'] } }
      end
    end

    # Dig up dirt from OpenSecrets.org about industry campaign contributors...
    def self.search_industries(id)
      safe_request('opensecrets industries', :ensure => id) do
        url = "#{URL}&method=candIndustry&cid=#{id}&apikey=#{SECRETS['opensecrets']}"
        info = get_json(url)['response']['industries']['industry']
        {'opensecrets_industries' => info.map {|el| el['@attributes'] } }
      end
    end

  end

end