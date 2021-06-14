import { ReactElement, useMemo } from 'react'
import { Button } from 'src/components/buttons/Button'
import DerivationIcon from 'src/components/icons/derivation_path.svg'
import { KeyIcon } from 'src/components/icons/Key'
import { LedgerIcon } from 'src/components/icons/logos/Ledger'
import { PlusIcon } from 'src/components/icons/Plus'
import { RadioBoxGrid } from 'src/components/input/RadioBoxRow'
import { TextInput } from 'src/components/input/TextInput'
import { Box } from 'src/components/layout/Box'
import { Color } from 'src/styles/Color'
import { Font } from 'src/styles/fonts'
import { Stylesheet } from 'src/styles/types'
import { useCustomForm } from 'src/utils/useCustomForm'
import { ErrorState, invalidInput } from 'src/utils/validation'

enum NewAccountAction {
  Add = 'add',
  Derive = 'derive',
  Import = 'import',
  Ledger = 'ledger',
}

interface AddAcountForm {
  name: string
  action: NewAccountAction
}

const initialValues: AddAcountForm = {
  name: '',
  action: NewAccountAction.Add,
}

export function AddAccountScreen() {
  const onSubmit = (values: AddAcountForm) => {
    alert(JSON.stringify(values))
  }

  const { values, errors, handleChange, handleBlur, handleSubmit } = useCustomForm<AddAcountForm>(
    initialValues,
    onSubmit,
    validate
  )

  const radioBoxLabels = useMemo(
    () => [
      {
        value: NewAccountAction.Add,
        label: (
          <RadioBoxOption
            title="Create New Account Key"
            subtitle="A completely new account with a different key"
            icon={<PlusIcon color={Color.primaryBlack} styles={style.optionIcon} />}
          />
        ),
      },
      {
        value: NewAccountAction.Derive,
        label: (
          <RadioBoxOption
            title="Derive From Current Key"
            subtitle="Use a different derivation path with your current key"
            icon={<img css={style.optionIcon} src={DerivationIcon} />}
          />
        ),
      },
      {
        value: NewAccountAction.Import,
        label: (
          <RadioBoxOption
            title="Import New Account Key"
            subtitle="Import a separate account with a different key"
            icon={<KeyIcon color={Color.primaryBlack} styles={style.optionIcon} />}
          />
        ),
      },
      {
        value: NewAccountAction.Ledger,
        label: (
          <RadioBoxOption
            title="Import From Ledger"
            subtitle="Import a separate account from your Ledger device"
            icon={<LedgerIcon color={Color.primaryBlack} styles={style.optionIcon} />}
          />
        ),
      },
    ],
    []
  )

  return (
    <>
      <h2 css={Font.h2Center}>Add New Account</h2>
      <form onSubmit={handleSubmit}>
        <Box direction="column" align="center">
          <Box align="center">
            <div css={style.nameLabelContainer}>
              <label htmlFor="name" css={Font.body}>
                New Account Name
              </label>
              <div css={Font.subtitle}>To help you stay oraganized</div>
            </div>
            <TextInput
              name="name"
              value={values.name}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="Savings account"
              width="12em"
              {...errors['name']}
            />
          </Box>
          <RadioBoxGrid
            name="action"
            value={values.action}
            labels={radioBoxLabels}
            onChange={handleChange}
          />
          <Button type="submit" margin="0.5em 0 0 0">
            Continue
          </Button>
        </Box>
      </form>
    </>
  )
}

interface RadioBoxOptionProps {
  title: string
  subtitle: string
  icon: ReactElement
}

function RadioBoxOption(props: RadioBoxOptionProps) {
  return (
    <Box align="center">
      <div>
        <div css={Font.body}>{props.title}</div>
        <div css={style.subtitle}> {props.subtitle}</div>
      </div>
      {props.icon}
    </Box>
  )
}

function validate(values: AddAcountForm): ErrorState {
  if (!values.name) return invalidInput('name', 'Name required')
  if (values.name.length > 100) return invalidInput('name', 'Name too long')
  if (!Object.values(NewAccountAction).includes(values.action))
    return invalidInput('action', 'Invalid action type')
  return { isValid: true }
}

const style: Stylesheet = {
  nameLabelContainer: {
    margin: '0 2em 0 1.1em',
    div: {
      marginTop: '0.25em',
    },
  },
  subtitle: {
    ...Font.subtitle,
    fontSize: '0.95em',
    marginTop: '0.5em',
    maxWidth: '12.5em',
  },
  optionIcon: {
    width: '1.7em',
    height: 'auto',
    marginLeft: '0.8em',
  },
}
