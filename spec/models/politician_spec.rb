require File.expand_path(File.dirname(__FILE__) + '/../spec_helper')

describe Politician do
  before(:each) do
    @valid_attributes = {
      :first_name => "Yvette",
      :last_name  => "Clarke"
    }
  end

  it "should create a new instance given valid attributes" do
    Politician.create!(@valid_attributes)
  end
end
