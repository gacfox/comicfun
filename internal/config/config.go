package config

import (
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Server ServerConfig `yaml:"server"`
	JWT    JWTConfig    `yaml:"jwt"`
	Data   DataConfig   `yaml:"data"`
}

type ServerConfig struct {
	Host string `yaml:"host"`
	Port int    `yaml:"port"`
}

type JWTConfig struct {
	Secret      string `yaml:"secret"`
	ExpireHours int    `yaml:"expire_hours"`
}

type DataConfig struct {
	Path string `yaml:"path"`
}

var cfg *Config

func Load() (*Config, error) {
	configPath := getConfigPath()

	data, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	var c Config
	if err := yaml.Unmarshal(data, &c); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %w", err)
	}

	cfg = &c
	return cfg, nil
}

func getConfigPath() string {
	if path := os.Getenv("CONFIG_FILE"); path != "" {
		return path
	}

	if os.Getenv("GIN_MODE") == "release" {
		return "config/config.prod.yaml"
	}
	return "config/config.dev.yaml"
}

func Get() *Config {
	return cfg
}

func (c *Config) ServerAddr() string {
	return fmt.Sprintf("%s:%d", c.Server.Host, c.Server.Port)
}

func (c *Config) DataPath() string {
	if filepath.IsAbs(c.Data.Path) {
		return c.Data.Path
	}
	absPath, err := filepath.Abs(c.Data.Path)
	if err != nil {
		return c.Data.Path
	}
	return absPath
}

func (c *Config) DBPath() string {
	return filepath.Join(c.DataPath(), "comicfun.db")
}

func (c *Config) UploadPath() string {
	return filepath.Join(c.DataPath(), "uploads")
}
