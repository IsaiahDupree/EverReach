#!/usr/bin/env ruby

# Script to add warning suppression flags to the main app target
# This suppresses nullability warnings from third-party pod headers

# Try to load xcodeproj from various locations
begin
  require 'xcodeproj'
rescue LoadError
  # Try common gem paths
  gem_paths = [
    File.expand_path('~/.gem/ruby/2.6.0/gems'),
    File.expand_path('~/.gem/ruby/3.0.0/gems'),
    File.expand_path('~/.gem/ruby/3.1.0/gems'),
    '/opt/homebrew/lib/ruby/gems/3.3.0/gems',
    '/usr/local/lib/ruby/gems/3.3.0/gems',
  ]
  
  loaded = false
  gem_paths.each do |path|
    xcodeproj_path = File.join(path, 'xcodeproj-*/lib')
    if Dir.glob(xcodeproj_path).any?
      $LOAD_PATH.unshift(File.join(path, 'xcodeproj-*/lib').gsub('*', Dir.glob(File.join(path, 'xcodeproj-*')).first.split('/').last))
      begin
        require 'xcodeproj'
        loaded = true
        break
      rescue LoadError
        next
      end
    end
  end
  
  unless loaded
    puts "❌ xcodeproj gem not found. Installing..."
    system('gem install xcodeproj --user-install') || exit(1)
    require 'xcodeproj'
  end
end

project_path = File.join(__dir__, '..', 'ios', 'AIEnhancedPersonalCRM.xcodeproj')

unless File.exist?(project_path)
  puts "❌ Project not found at #{project_path}"
  exit 1
end

puts "🔧 Adding warning suppression flags to app target..."

project = Xcodeproj::Project.open(project_path)

project.targets.each do |target|
  next unless target.name == 'AIEnhancedPersonalCRM'
  
  target.build_configurations.each do |config|
    # Get existing WARNING_CFLAGS or create new array
    existing_flags = config.build_settings['WARNING_CFLAGS'] || []
    
    # Convert to array if it's a string
    if existing_flags.is_a?(String)
      existing_flags = existing_flags.split(' ')
    end
    
    # Ensure it's an array
    existing_flags = Array(existing_flags)
    
    # Flags to add
    new_flags = [
      '-Wno-nullability-completeness',
      '-Wno-nullability-extension',
    ]
    
    # Add flags if not already present
    new_flags.each do |flag|
      unless existing_flags.include?(flag)
        existing_flags << flag
        puts "  ✅ Added #{flag} to #{config.name} configuration"
      else
        puts "  ℹ️  #{flag} already present in #{config.name} configuration"
      end
    end
    
    # Update build settings
    config.build_settings['WARNING_CFLAGS'] = existing_flags
    config.build_settings['CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER'] = 'NO'
    config.build_settings['CLANG_WARN_UNGUARDED_AVAILABILITY'] = 'NO'
  end
end

project.save

puts "✨ Done! Warning flags added to app target."

