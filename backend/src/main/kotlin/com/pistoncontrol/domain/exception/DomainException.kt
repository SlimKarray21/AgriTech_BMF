package com.pistoncontrol.domain.exception

open class DomainException(message: String) : RuntimeException(message)

class DomainNotFoundException(message: String) : DomainException(message)

class DomainValidationException(message: String) : DomainException(message)
