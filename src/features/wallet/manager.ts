import { CeloWallet } from '@celo-tools/celo-ethers-wrapper'
import { utils, Wallet } from 'ethers'
import type { RootState } from 'src/app/rootReducer'
import { getProvider } from 'src/blockchain/provider'
import { getSigner, setSigner, SignerType } from 'src/blockchain/signer'
import { CELO_DERIVATION_PATH } from 'src/consts'
import { resetFeed } from 'src/features/feed/feedSlice'
import { fetchFeedActions } from 'src/features/feed/fetchFeed'
import { createLedgerSigner } from 'src/features/ledger/signerFactory'
import { fetchBalancesActions } from 'src/features/wallet/balances/fetchBalances'
import { tryDecryptMnemonic, tryEncryptMnemonic } from 'src/features/wallet/encryption'
import {
  addAccount as addAccountToStorage,
  getAccounts as getAccountsFromStorage,
  StoredAccountData,
} from 'src/features/wallet/storage'
import { normalizeMnemonic } from 'src/features/wallet/utils'
import { setAccount } from 'src/features/wallet/walletSlice'
import { areAddressesEqual } from 'src/utils/addresses'
import { logger } from 'src/utils/logger'
import { call, put, select } from 'typed-redux-saga'

export interface LocalAccount {
  type: SignerType.Local
  mnemonic: string
  derivationPath: string
  locale?: string
}

export interface LedgerAccount {
  type: SignerType.Ledger
  address: string
  derivationPath: string
}

const accountListCache: Map<string, StoredAccountData> = new Map()

export function getAccounts() {
  if (accountListCache.size <= 0) {
    const storedAccounts = getAccountsFromStorage()
    for (const a of storedAccounts) {
      accountListCache.set(a.address, a)
    }
  }
  return accountListCache
}

export function hasAccounts() {
  return getAccounts().size !== 0
}

export function* loadAccount(address: string, password?: string) {
  const accounts = getAccounts()
  const activeAccount = accounts.get(address)
  if (!activeAccount) throw new Error(`No account found with address ${address}`)

  if (activeAccount.type === SignerType.Local) {
    const { encryptedMnemonic, derivationPath } = activeAccount
    if (!password) throw new Error('Password required for local accounts')
    if (!encryptedMnemonic) throw new Error('Expected local account to have mnemonic')
    const mnemonic = yield* call(tryDecryptMnemonic, encryptedMnemonic, password)

    const wallet = Wallet.fromMnemonic(mnemonic, derivationPath)
    if (!areAddressesEqual(wallet.address, address))
      throw new Error('Address from menmonic does not match desired address')

    yield* call(activateLocalAccount, wallet)
  } else if (activeAccount.type === SignerType.Ledger) {
    const { address, derivationPath } = activeAccount
    yield* call(activateLedgerAccount, { type: SignerType.Ledger, address, derivationPath })
  } else {
    throw new Error('Invalid account signer type')
  }
}

export function createRandomAccount() {
  const entropy = utils.randomBytes(32)
  const mnemonic = utils.entropyToMnemonic(entropy)
  const derivationPath = CELO_DERIVATION_PATH + '/0'
  return Wallet.fromMnemonic(mnemonic, derivationPath)
}

export function* addAccount(newAccount: LocalAccount | LedgerAccount, password?: string) {
  if (newAccount.type === SignerType.Local) {
    if (!password) throw new Error('Password required for local accounts')

    const { mnemonic, derivationPath, locale } = newAccount
    const formattedMnemonic = normalizeMnemonic(mnemonic)
    const encryptedMnemonic = yield* call(tryEncryptMnemonic, formattedMnemonic, password)
    const wallet = Wallet.fromMnemonic(formattedMnemonic, derivationPath)
    const storedAccount: StoredAccountData = {
      type: SignerType.Local,
      address: wallet.address,
      derivationPath,
      locale,
      encryptedMnemonic,
    }

    addAccountToStorage(storedAccount)
    accountListCache.set(storedAccount.address, storedAccount)
    yield* call(activateLocalAccount, wallet)
  } else if (newAccount.type === SignerType.Ledger) {
    addAccountToStorage(newAccount)
    accountListCache.set(newAccount.address, newAccount)
    yield* call(activateLedgerAccount, newAccount)
  } else {
    throw new Error('Invalid new account type')
  }
}

function* activateLocalAccount(ethersWallet: Wallet) {
  const provider = getProvider()
  const celoWallet = new CeloWallet(ethersWallet, provider)
  setSigner({ signer: celoWallet, type: SignerType.Local })
  yield* call(onAccountActivation, celoWallet.address, SignerType.Local)
}

function* activateLedgerAccount(account: LedgerAccount) {
  const provider = getProvider()
  const ledgerSigner = yield* call(createLedgerSigner, account.derivationPath, provider)
  const address = ledgerSigner.address
  if (!address || !areAddressesEqual(address, account.address)) {
    throw new Error('Address mismatch, account may be on a different Ledger')
  }
  setSigner({ signer: ledgerSigner, type: SignerType.Ledger })
  yield* call(onAccountActivation, address, SignerType.Ledger)
}

function* onAccountActivation(address: string, type: SignerType) {
  // Grab the current address from the store (may have been loaded by persist)
  const currentAddress = yield* select((state: RootState) => state.wallet.address)
  yield* put(setAccount({ address, type }))
  yield* put(fetchBalancesActions.trigger())

  if (currentAddress && !areAddressesEqual(currentAddress, address)) {
    logger.debug('New address does not match current one in store')
    //TODO load in feed data
    yield* put(resetFeed())
  }
  yield* put(fetchFeedActions.trigger())
}

export function* removeAccount(address: string) {
  //TODO
}

export function getActiveAccount() {
  const signer = getSigner()
  const address = signer.signer.address
  if (!address)
    throw new Error('Signer address not set, may be a LedgerSigner not properly initialized')
  const mnemonic = signer.type === SignerType.Local ? signer.signer.mnemonic.phrase : undefined
  return { address, mnemonic, type: signer.type }
}
