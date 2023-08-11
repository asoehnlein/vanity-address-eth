# Vanity Address Generator

Generate custom Ethereum addresses with specific prefixes or suffixes. This generator is designed to be fast and efficient, leveraging all available CPU cores without overloading system memory.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Table of Contents
- [Installation](#installation)
- [Usage](#usage)
- [Command-Line Arguments](#command-line-arguments)
- [Configuration](#configuration)
- [Features](#features)
- [Contribution](#contribution)
- [Credits](#credits)
- [License](#license)

## Installation
1. Clone the repository.
2. Install the required dependencies:
   ```
   npm install cluster os fs secp256k1 keccak crypto minimist
   ```
3. Run the script:
   ```
   node address_generator.js
   ```

## Usage
You can run the script with custom command-line arguments to define your desired prefix, suffix, and other parameters for generating vanity Ethereum addresses.

## Command-Line Arguments
- `-s, --startPattern`: Desired prefix for the address (default: "").
- `-e, --endPattern`: Desired suffix for the address (default: "").
- `-c, --isChecksum`: Whether the address should be checksummed (default: false).
- `-p, --step`: Step size for a particular operation (default: 50,000).
- `-m, --maxTries`: Maximum number of attempts for address generation (default: 5,000,000,000,000,000).
- `-i, --logOutputIntervall`: Interval for logging the total number of checked addresses (default: 10,000 ms).

## Configuration
You can also modify the default values directly in the `address_generator.js` file.

## Features
- Fast and parallelized generation using all CPU cores.
- Customizable prefix and suffix patterns through command-line arguments.
- Supports both regular and checksummed Ethereum addresses.
- Graceful handling of termination signals.
- Real-time logging of progress and writing the result to a file.

## Contribution
Contributions are welcome! Feel free to submit issues or pull requests.

## Credits
- Based on the work of [bokub/vanity-eth](https://github.com/bokub/vanity-eth). Special thanks to "bokub" for the inspiration.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
