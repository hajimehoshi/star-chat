def update
  system('git pull')
end

def start(config_file)
  system("thin -C #{config_file} start")
end

def stop(config_file)
  system("thin -C #{config_file} stop")
end

def show_usage
  STDERR.puts('Usage:')
  STDERR.puts("  ruby #{$0} {start|stop|restart} CONFIG_FILE")
  STDERR.puts("  ruby #{$0} update")
end

def main(argv)
  if argv.size < 1
    show_usage
    return
  end
  command, config_file = *argv
  case argv[0]
  when 'start'
    unless config_file
      show_usage
      return
    end
    start(config_file)
  when 'stop'
    unless config_file
      show_usage
      return
    end
    stop(config_file)
  when 'restart'
    unless config_file
      show_usage
      return
    end
    stop(config_file)
    start(config_file)
  when 'update'
    update
  end
end

main(ARGV) if $0 == __FILE__
