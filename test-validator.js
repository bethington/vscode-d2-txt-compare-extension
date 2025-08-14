const path = require('path')
const { D2FileValidator } = require('./out/utils/fileValidator')

// Mock URI object for validator
const mockUri = {
  fsPath: path.join(__dirname, 'sample-data', 'Weapons.txt'),
  scheme: 'file'
}

async function testValidator () {
  try {
    const validator = new D2FileValidator()
    console.log('Testing file validator with Weapons.txt...')

    const result = await validator.validateFile(mockUri)

    console.log('\nValidation Results:')
    console.log('Is Valid:', result.isValid)
    console.log('Errors:', result.errors.length)
    console.log('Warnings:', result.warnings.length)

    if (result.errors.length > 0) {
      console.log('\nErrors:')
      result.errors.slice(0, 5).forEach(error => {
        console.log(
          `  Line ${error.line}, Col ${error.column}: ${error.message}`
        )
      })
      if (result.errors.length > 5) {
        console.log(`  ... and ${result.errors.length - 5} more errors`)
      }
    }

    if (result.warnings.length > 0) {
      console.log('\nWarnings:')
      result.warnings.slice(0, 5).forEach(warning => {
        console.log(
          `  Line ${warning.line}, Col ${warning.column}: ${warning.message}`
        )
      })
      if (result.warnings.length > 5) {
        console.log(`  ... and ${result.warnings.length - 5} more warnings`)
      }
    }
  } catch (error) {
    console.error('Test failed:', error.message)
  }
}
