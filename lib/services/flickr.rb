module Services

  module Flickr
    extend Base

    URL = 'api.flickr.com/services/rest?method=flickr.photos.search&format=json&nojsoncallback=1&sort=relevance&per_page=10&extras=owner_name'

    # Dig up (embarrassing) photos of the politician on Flickr...
    def self.search(first_name, last_name)
      safe_request('flickr') do
        url = "#{URL}&api_key=#{SECRETS['flickr_key']}&text=\"#{first_name} #{last_name}\""
        photos = get_json(url)['photos']
        {'flickr' => photos ? photos['photo'] : []}
      end
    end

  end

end